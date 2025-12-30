/**
 * VCS Integration Helper
 * Automatically tracks database changes for version control
 */

export interface DatabaseChange {
    type: 'SCHEMA' | 'DATA';
    operation: 'CREATE' | 'ALTER' | 'DROP' | 'INSERT' | 'UPDATE' | 'DELETE';
    target: string;
    description: string;
    query?: string;
    tableName?: string;
    affectedRows?: number;
}

/**
 * Track a database change for version control
 */
export async function trackChange(connectionId: string, change: DatabaseChange): Promise<void> {
    try {
        await fetch('/api/vcs/pending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connectionId, change })
        });
    } catch (error) {
        console.error('Failed to track change:', error);
    }
}

/**
 * Track a schema change (CREATE, ALTER, DROP table)
 */
export async function trackSchemaChange(
    connectionId: string,
    operation: 'create' | 'alter' | 'drop',
    tableName: string,
    sql: string,
    author: { id: string; name: string }
): Promise<void> {
    const change: DatabaseChange = {
        type: 'SCHEMA',
        operation: operation.toUpperCase() as 'CREATE' | 'ALTER' | 'DROP',
        target: tableName,
        tableName,
        description: `${operation.charAt(0).toUpperCase() + operation.slice(1)} table ${tableName} by ${author.name}`,
        query: sql
    };

    await trackChange(connectionId, change);
}

/**
 * Parse SQL query to detect change type
 */
export function parseQueryForChanges(query: string, affectedRows?: number): DatabaseChange | null {
    // Remove comments and trim
    const cleanQuery = query.replace(/\/\*[\s\S]*?\*\/|--.*?\n/g, '').trim();
    const normalizedQuery = cleanQuery.toUpperCase();

    // Table Schema changes
    if (normalizedQuery.includes('CREATE TABLE')) {
        const match = cleanQuery.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"]?)(\w+)\1/i);
        const tableName = match ? match[2] : 'unknown';
        return {
            type: 'SCHEMA',
            operation: 'CREATE',
            target: tableName,
            tableName,
            description: `Create table ${tableName}`,
            query
        };
    }

    if (normalizedQuery.includes('ALTER TABLE')) {
        const match = cleanQuery.match(/ALTER\s+TABLE\s+([`"]?)(\w+)\1/i);
        const tableName = match ? match[2] : 'unknown';
        return {
            type: 'SCHEMA',
            operation: 'ALTER',
            target: tableName,
            tableName,
            description: `Alter table ${tableName}`,
            query
        };
    }

    if (normalizedQuery.includes('DROP TABLE')) {
        const match = cleanQuery.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([`"]?)(\w+)\1/i);
        const tableName = match ? match[2] : 'unknown';
        return {
            type: 'SCHEMA',
            operation: 'DROP',
            target: tableName,
            tableName,
            description: `Drop table ${tableName}`,
            query
        };
    }

    // Procedure/Function/View Schema changes
    const procMatch = cleanQuery.match(/CREATE\s+(?:OR\s+REPLACE\s+)?(PROCEDURE|FUNCTION|VIEW|ROUTINE)\s+([`"]?)(\w+)\2/i);
    if (procMatch) {
        const type = procMatch[1].toUpperCase();
        const name = procMatch[3];
        return {
            type: 'SCHEMA',
            operation: 'CREATE',
            target: name,
            description: `Create ${type.toLowerCase()} ${name}`,
            query
        };
    }

    const dropProcMatch = cleanQuery.match(/DROP\s+(PROCEDURE|FUNCTION|VIEW|ROUTINE)\s+(?:IF\s+EXISTS\s+)?([`"]?)(\w+)\2/i);
    if (dropProcMatch) {
        const type = dropProcMatch[1].toUpperCase();
        const name = dropProcMatch[3];
        return {
            type: 'SCHEMA',
            operation: 'DROP',
            target: name,
            description: `Drop ${type.toLowerCase()} ${name}`,
            query
        };
    }

    // Data changes (DML) - typically start with the keyword
    if (normalizedQuery.startsWith('INSERT INTO')) {
        const match = cleanQuery.match(/INSERT\s+INTO\s+([`"]?)(\w+)\1/i);
        const tableName = match ? match[2] : 'unknown';
        return {
            type: 'DATA',
            operation: 'INSERT',
            target: tableName,
            tableName,
            description: `Insert ${affectedRows || 1} row(s) into ${tableName}`,
            query,
            affectedRows
        };
    }

    if (normalizedQuery.startsWith('UPDATE')) {
        const match = cleanQuery.match(/UPDATE\s+([`"]?)(\w+)\1/i);
        const tableName = match ? match[2] : 'unknown';
        return {
            type: 'DATA',
            operation: 'UPDATE',
            target: tableName,
            tableName,
            description: `Update ${affectedRows || 'unknown'} row(s) in ${tableName}`,
            query,
            affectedRows
        };
    }

    if (normalizedQuery.startsWith('DELETE FROM')) {
        const match = cleanQuery.match(/DELETE\s+FROM\s+([`"]?)(\w+)\1/i);
        const tableName = match ? match[2] : 'unknown';
        return {
            type: 'DATA',
            operation: 'DELETE',
            target: tableName,
            tableName,
            description: `Delete ${affectedRows || 'unknown'} row(s) from ${tableName}`,
            query,
            affectedRows
        };
    }

    return null;
}

/**
 * Generate inverse SQL to undo a change
 */
export function generateInverseSQL(change: DatabaseChange): string | null {
    const { type, operation, target, query, tableName } = change;

    if (type === 'SCHEMA') {
        if (operation === 'CREATE') {
            return `DROP TABLE IF EXISTS ${target};`;
        }
        if (operation === 'DROP') {
            // We can't easily undo a DROP unless we have the original CREATE SQL
            if (query && query.toUpperCase().includes('CREATE TABLE')) {
                return query;
            }
            return null;
        }
        if (operation === 'ALTER') {
            // ALTER is complex to undo without knowing the previous state
            return null;
        }
    }

    if (type === 'DATA') {
        if (operation === 'INSERT') {
            // For undoing an INSERT, we'd ideally need the PK values
            // Currently, we don't track enough info for a surgical DELETE
            // But if we have the tableName, we can provide a hint
            return `-- Undo INSERT into ${tableName || target}\n-- DELETE FROM ${tableName || target} WHERE ...`;
        }
        if (operation === 'UPDATE') {
            // Undo UPDATE requires the old values
            return `-- Undo UPDATE to ${tableName || target}\n-- Old values were potentially lost if not in snapshot`;
        }
        if (operation === 'DELETE') {
            // Undo DELETE is an INSERT (requires old values)
            return `-- Undo DELETE from ${tableName || target}\n-- Re-inserting lost rows...`;
        }
    }

    return null;
}

/**
 * Get pending changes for a connection
 */
export async function getPendingChanges(connectionId: string): Promise<DatabaseChange[]> {
    try {
        const response = await fetch(`/api/vcs/pending?connectionId=${connectionId}`);
        const data = await response.json();
        return data.changes || [];
    } catch (error) {
        console.error('Failed to get pending changes:', error);
        return [];
    }
}

/**
 * Commit pending changes
 */
export async function commitChanges(
    connectionId: string,
    message: string,
    author: { name: string; email: string }
): Promise<boolean> {
    try {
        const pending = await getPendingChanges(connectionId);

        const response = await fetch('/api/vcs/commit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                connectionId,
                message,
                author,
                changes: pending,
                snapshot: {
                    schema: { tables: {} },
                    data: { tables: {} },
                    timestamp: new Date()
                }
            })
        });

        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error('Failed to commit changes:', error);
        return false;
    }
}

/**
 * Get commit history for a connection
 */
export async function getCommitHistory(connectionId: string) {
    try {
        const response = await fetch(`/api/vcs/commit?connectionId=${connectionId}`);
        const data = await response.json();
        return data.commits || [];
    } catch (error) {
        console.error('Failed to get commit history:', error);
        return [];
    }
}

/**
 * Get branches for a connection
 */
export async function getBranches(connectionId: string) {
    try {
        const response = await fetch(`/api/vcs/branches?connectionId=${connectionId}`);
        const data = await response.json();
        return { branches: data.branches || [], currentBranch: data.currentBranch || 'main' };
    } catch (error) {
        console.error('Failed to get branches:', error);
        return { branches: [], currentBranch: 'main' };
    }
}

/**
 * Create a new branch
 */
export async function createBranch(connectionId: string, name: string): Promise<boolean> {
    try {
        const response = await fetch('/api/vcs/branches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connectionId, name, action: 'create' })
        });
        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error('Failed to create branch:', error);
        return false;
    }
}

/**  
 * Checkout a branch
 */
export async function checkoutBranch(connectionId: string, name: string): Promise<boolean> {
    try {
        const response = await fetch('/api/vcs/branches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connectionId, name, action: 'checkout' })
        });
        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error('Failed to checkout branch:', error);
        return false;
    }
}
