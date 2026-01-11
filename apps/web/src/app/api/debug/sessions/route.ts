import { NextRequest, NextResponse } from 'next/server';
import { createDebugSession } from '@/lib/debug-engine';
import { log } from '@/lib/console-logger';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { connectionId, query, breakpoints } = body;

        log.api('Creating debug session', { connectionId, queryLength: query?.length, breakpoints });

        if (!connectionId || !query) {
            log.warn('Missing required fields for debug session');
            return NextResponse.json(
                { error: 'connectionId and query are required' },
                { status: 400 }
            );
        }

        const session = createDebugSession(connectionId, query, breakpoints || []);

        log.success(`Debug session created: ${session.id}`);

        return NextResponse.json({
            success: true,
            session: {
                id: session.id,
                connectionId: session.connectionId,
                status: session.status,
                breakpoints: session.breakpoints,
                statements: session.statements.length
            }
        });
    } catch (error: any) {
        log.error('Failed to create debug session', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create session' },
            { status: 500 }
        );
    }
}

export async function GET(_req: NextRequest) {
    return NextResponse.json({ sessions: [] });
}
