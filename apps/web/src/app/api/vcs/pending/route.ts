import { NextRequest, NextResponse } from 'next/server';
import { addPendingChange, getPendingChangesFromStorage, clearPendingChanges } from '@/lib/vcs-storage';

// POST /api/vcs/pending - Track a new change
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { connectionId, change } = body;

        if (!connectionId || !change) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await addPendingChange(connectionId, change);
        const pending = await getPendingChangesFromStorage(connectionId);

        return NextResponse.json({ success: true, changes: pending });
    } catch (error) {
        console.error('VCS pending error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

// GET /api/vcs/pending?connectionId=xxx
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
        return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
    }

    try {
        const changes = await getPendingChangesFromStorage(connectionId);
        return NextResponse.json({ changes });
    } catch (error) {
        console.error('VCS get pending error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

// DELETE /api/vcs/pending - Clear all pending changes
export async function DELETE(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
        return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
    }

    try {
        await clearPendingChanges(connectionId);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('VCS delete pending error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
