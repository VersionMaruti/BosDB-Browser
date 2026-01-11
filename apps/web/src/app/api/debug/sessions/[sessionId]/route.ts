/**
 * Debug API - Session Operations
 * GET/DELETE /api/debug/sessions/[sessionId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDebugSession, deleteSession } from '@/lib/debug-engine';

interface RouteParams {
    params: {
        sessionId: string;
    };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
    try {
        const session = getDebugSession(params.sessionId);

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        return NextResponse.json({
            session: {
                id: session.id,
                connectionId: session.connectionId,
                status: session.status,
                currentStatementIndex: session.currentStatementIndex,
                breakpoints: session.breakpoints,
                statements: session.statements.length
            },
        });
    } catch (error: any) {
        console.error('Error getting debug session:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to get session' },
            { status: 500 }
        );
    }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
    try {
        const session = getDebugSession(params.sessionId);

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        deleteSession(params.sessionId);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting debug session:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete session' },
            { status: 500 }
        );
    }
}
