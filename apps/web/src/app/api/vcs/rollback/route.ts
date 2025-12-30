import { NextRequest, NextResponse } from 'next/server';
import { createVersionControl, FileStorage } from '@bosdb/version-control';
import path from 'path';
import { promises as fs } from 'fs';
import { generateInverseSQL } from '@/lib/vcs-helper';
import { connections, adapterInstances } from '@/lib/store';
import { AdapterFactory } from '@bosdb/db-adapters';
import { decryptCredentials } from '@bosdb/security';
import { Logger } from '@bosdb/utils';

const logger = new Logger('RollbackAPI');

// POST /api/vcs/rollback - Rollback to a specific commit
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { connectionId, commitId, targetRevision, author, isRevert } = body;

        if (!connectionId) {
            return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
        }

        const connectionInfo = connections.get(connectionId);
        if (!connectionInfo) {
            return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
        }

        // Initialize VCS
        const vcsPath = path.join(process.cwd(), '.bosdb-vcs', connectionId);
        await fs.mkdir(vcsPath, { recursive: true });

        const storage = new FileStorage(vcsPath);
        await storage.initialize();

        const vc = createVersionControl(connectionId, storage);

        // Ensure initialized and state is loaded
        await vc.initialize();
        await (vc as any).loadHEAD();

        // Get all commits
        const logResult = await vc.log({ maxCount: 1000 });
        if (!logResult.success || !logResult.data || logResult.data.length === 0) {
            return NextResponse.json({ error: 'No commits to rollback to' }, { status: 404 });
        }

        const commits = logResult.data;

        // Find target commit
        let targetCommit;
        let commitsToUndo: any[] = [];

        if (isRevert && commitId) {
            // Revert a single specific commit
            targetCommit = commits.find((c: any) => c.id === commitId);
            if (targetCommit) {
                commitsToUndo = [targetCommit];
            }
        } else if (targetRevision !== undefined) {
            // Rollback by revision number (e.g., -2 for 2nd previous)
            const targetIndex = Math.abs(targetRevision);
            targetCommit = commits[targetIndex];
            // Collect all commits between HEAD and target (exclusive of target's state)
            commitsToUndo = commits.slice(0, targetIndex);
        } else if (commitId) {
            // Rollback by commit ID
            const targetIndex = commits.findIndex((c: any) => c.id === commitId);
            if (targetIndex !== -1) {
                targetCommit = commits[targetIndex];
                commitsToUndo = commits.slice(0, targetIndex);
            }
        }

        if (!targetCommit) {
            return NextResponse.json({ error: 'Target commit not found' }, { status: 404 });
        }

        // --- PHYSICAL ROLLBACK ---
        // Generate inverse SQL for all changes being undone
        const undoSQLs: string[] = [];
        for (const commit of commitsToUndo) {
            for (const change of commit.changes) {
                const sql = generateInverseSQL(change);
                if (sql) undoSQLs.push(sql);
            }
        }

        logger.info(`Rollback initiated for ${connectionId}. ${undoSQLs.length} undo operations found.`);

        // Execute SQL on database if there are changes to undo
        if (undoSQLs.length > 0) {
            // Get or create adapter
            let adapterInfo = adapterInstances.get(connectionId);
            if (!adapterInfo) {
                const adapter = AdapterFactory.create(connectionInfo.type);
                const credentials = decryptCredentials(connectionInfo.credentials);
                const connectResult = await adapter.connect({
                    name: connectionInfo.name,
                    host: connectionInfo.host,
                    port: connectionInfo.port,
                    database: connectionInfo.database,
                    username: credentials.username,
                    password: credentials.password,
                    ssl: connectionInfo.ssl,
                    readOnly: connectionInfo.readOnly,
                });
                if (!connectResult.success) {
                    return NextResponse.json({ error: 'Failed to connect to database for rollback' }, { status: 500 });
                }
                adapterInfo = { adapter, adapterConnectionId: connectResult.connectionId };
                adapterInstances.set(connectionId, adapterInfo);
            }

            // Execute each undo SQL
            for (const sql of undoSQLs) {
                try {
                    // Skip execution for comments or hints
                    if (sql.trim().startsWith('--')) {
                        logger.info(`Skipping hint: ${sql}`);
                        continue;
                    }

                    logger.info(`Executing undo SQL: ${sql}`);
                    await adapterInfo.adapter.executeQuery({
                        connectionId: adapterInfo.adapterConnectionId,
                        query: sql,
                        timeout: 30000,
                    });
                } catch (sqlError) {
                    logger.error(`Failed to execute undo SQL: ${sql}`, sqlError);
                    // We continue for now, but ideally we should handle partial failures
                }
            }
        }

        // --- VCS SNAPSHOT UPDATE ---
        // Use provided author or default to system
        const rollbackAuthor = author || {
            name: 'System',
            email: 'system@bosdb.com'
        };

        // Create a new commit that reflects the rollback/revert
        const revertMessage = isRevert
            ? `Revert: ${targetCommit.message} (${targetCommit.id.substring(0, 8)})`
            : `Rollback to: ${targetCommit.message} (${targetCommit.id.substring(0, 8)})`;

        const revertCommit = await vc.commit(
            revertMessage,
            {
                ...rollbackAuthor,
                timestamp: new Date()
            },
            commitsToUndo.flatMap(c => c.changes).map(change => ({
                ...change,
                operation: 'ROLLBACK' as any,
                description: `Undone: ${change.description}`
            })),
            (targetCommit as any).snapshot || { schema: { tables: {} }, data: { tables: {} }, timestamp: new Date() }
        );

        if (!revertCommit.success) {
            return NextResponse.json({ error: 'Failed to create revert commit' }, { status: 500 });
        }

        // Clear pending changes as they're now invalid after rollback
        const pendingPath = path.join(vcsPath, 'pending.json');
        await fs.writeFile(pendingPath, JSON.stringify({ changes: [] }));

        return NextResponse.json({
            success: true,
            message: isRevert ? `Reverted commit ${targetCommit.id.substring(0, 8)}` : `Rolled back to revision ${targetRevision || 'unknown'}`,
            targetCommit,
            revertCommit: revertCommit.data,
            performedBy: rollbackAuthor
        });
    } catch (error) {
        logger.error('Rollback error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

// GET /api/vcs/rollback/diff?connectionId=xxx&fromRevision=0&toRevision=-1
// Compare two revisions
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const connectionId = searchParams.get('connectionId');
    const fromRev = parseInt(searchParams.get('fromRevision') || '0');
    const toRev = parseInt(searchParams.get('toRevision') || '-1');

    if (!connectionId) {
        return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
    }

    try {
        const vcsPath = path.join(process.cwd(), '.bosdb-vcs', connectionId);
        await fs.mkdir(vcsPath, { recursive: true });

        const storage = new FileStorage(vcsPath);
        await storage.initialize();

        const vc = createVersionControl(connectionId, storage);

        // Ensure initialized and state is loaded
        await vc.initialize();
        await (vc as any).loadHEAD();

        // Get commits
        const logResult = await vc.log({ maxCount: 1000 });
        if (!logResult.success || !logResult.data || logResult.data.length === 0) {
            return NextResponse.json({
                error: 'No commits to compare',
                from: { revision: fromRev, commit: null, changes: [] },
                to: { revision: toRev, commit: null, changes: [] },
                changesSummary: { added: [], modified: [], removed: [] }
            });
        }

        const commits = logResult.data;

        const fromIndex = Math.abs(fromRev);
        const toIndex = Math.abs(toRev);

        const fromCommit = commits[fromIndex];
        const toCommit = commits[toIndex];

        if (!fromCommit && !toCommit) {
            return NextResponse.json({
                error: 'Revisions not found - not enough commits in history',
                from: { revision: fromRev, commit: null, changes: [] },
                to: { revision: toRev, commit: null, changes: [] },
                changesSummary: { added: [], modified: [], removed: [] }
            });
        }

        // Calculate differences
        const differences = {
            from: {
                revision: fromRev,
                commit: fromCommit || null,
                changes: fromCommit?.changes || []
            },
            to: {
                revision: toRev,
                commit: toCommit || null,
                changes: toCommit?.changes || []
            },
            changesSummary: {
                added: [],
                modified: [],
                removed: []
            }
        };

        return NextResponse.json(differences);
    } catch (error) {
        logger.error('Diff error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
