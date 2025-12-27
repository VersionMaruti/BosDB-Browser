import { NextRequest, NextResponse } from 'next/server';
import { getUsers, createUser, findUserById } from '@/lib/users-store';
import { hashPassword, verifyPassword, validatePassword } from '@/lib/auth';

export async function GET() {
    // Public endpoint to list simple user info (for login page dropdown)
    const users = getUsers();
    const publicUsers = users.map(u => ({ id: u.id, name: u.name, role: u.role }));
    return NextResponse.json({ users: publicUsers });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, userId, password, ...userData } = body;

        if (action === 'login') {
            const user = findUserById(userId);
            console.log('[Auth API] Login attempt for userId:', userId);
            console.log('[Auth API] User found:', user ? 'YES' : 'NO');

            if (!user) {
                console.log('[Auth API] User not found, returning 401');
                return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
            }

            console.log('[Auth API] User has password field:', !!user.password);
            console.log('[Auth API] Password provided:', !!password);
            console.log('[Auth API] Stored password value:', user.password?.substring(0, 20) + '...');

            // Special case: Admin user with known password
            if (userId === 'admin' && password === 'Admin@123') {
                console.log('[Auth API] Admin login with master password');
                // Allow login
            } else if (user.password) {
                // Try bcrypt verification
                try {
                    const isValid = await verifyPassword(password || '', user.password);
                    console.log('[Auth API] Password verification result:', isValid);
                    if (!isValid) {
                        // Also check plain text match for legacy
                        if (user.password !== password) {
                            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
                        }
                    }
                } catch (err) {
                    console.error('[Auth API] bcrypt error:', err);
                    // Fallback to plain text check
                    if (user.password !== password) {
                        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
                    }
                }
            } else {
                // Legacy users without password - check if default password "admin"
                console.log('[Auth API] Legacy user, checking default password');
                if (password !== 'admin') {
                    console.log('[Auth API] Default password mismatch');
                    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
                }
            }

            if (user.status === 'pending') {
                return NextResponse.json({ error: 'Your account is pending admin approval.' }, { status: 403 });
            }

            if (user.status === 'rejected') {
                return NextResponse.json({ error: 'Your account has been rejected.' }, { status: 403 });
            }

            console.log('[Auth API] Login successful for:', userId);
            return NextResponse.json({ success: true, user });
        }

        if (action === 'register') {
            const users = getUsers();

            // Basic validation
            if (users.some(u => u.id === userData.id)) {
                return NextResponse.json({ error: 'User ID already exists' }, { status: 409 });
            }

            // Validate password
            if (!password) {
                return NextResponse.json({ error: 'Password is required' }, { status: 400 });
            }

            const validation = validatePassword(password);
            if (!validation.valid) {
                return NextResponse.json({ error: validation.error }, { status: 400 });
            }

            // Hash password
            const hashedPassword = await hashPassword(password);

            // If it's the specific starting admin, allow approved
            const status = (users.length === 0 && userData.id === 'admin') ? 'approved' : 'pending';

            const newUser = {
                ...userData,
                password: hashedPassword,
                status: status, // First admin is approved, others pending
                createdAt: new Date()
            };

            createUser(newUser);
            return NextResponse.json({ success: true, user: newUser });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('Auth API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
