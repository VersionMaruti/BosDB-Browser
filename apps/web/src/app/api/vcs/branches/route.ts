import { NextRequest, NextResponse } from 'next/server';
import { getBranchesFromStorage, createBranchInStorage, switchBranch, getCurrentBranch } from '@/lib/vcs-storage';

// GET /api/vcs/branches?connectionId=xxx - List branches
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
        return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
    }

    try {
        const branches = await getBranchesFromStorage(connectionId);
        const currentBranch = await getCurrentBranch(connectionId);

        return NextResponse.json({
            branches: branches.map(b => b.name),
            currentBranch
        });
    } catch (error) {
        console.error('Get branches error:', error);
        return NextResponse.json({ branches: ['main'], currentBranch: 'main' });
    }
}

// POST /api/vcs/branches - Create or checkout branch
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { connectionId, name, action } = body;

        if (!connectionId || !name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (action === 'create') {
            await createBranchInStorage(connectionId, name);
            return NextResponse.json({ success: true, branch: name });
        } else if (action === 'checkout') {
            await switchBranch(connectionId, name);
            return NextResponse.json({ success: true, currentBranch: name });
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        console.error('Branch operation error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
