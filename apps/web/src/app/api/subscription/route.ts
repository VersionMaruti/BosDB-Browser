import { NextRequest, NextResponse } from 'next/server';
import { getSystemSubscription, updateSystemSubscription, isSystemPro, isSystemTrial } from '@/lib/system-subscription';

// GET /api/subscription - Get system subscription status
export async function GET() {
    try {
        const subscription = getSystemSubscription();
        const isPro = isSystemPro();
        const isTrial = isSystemTrial();

        return NextResponse.json({
            subscription,
            isPro,
            isTrial
        });
    } catch (error: any) {
        console.error('[Subscription API] Error:', error);
        return NextResponse.json({ error: 'Failed to get subscription' }, { status: 500 });
    }
}

// POST /api/subscription - Upgrade system subscription (demo payment)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { plan, companyName, cardNumber, expiryDate, cvv, userId } = body;

        console.log('[Subscription API] Processing upgrade for plan:', plan);

        // Validate plan
        if (!plan || !['pro_trial', 'pro_monthly', 'pro_yearly'].includes(plan)) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }

        // For paid plans, validate card (demo)
        if (plan !== 'pro_trial') {
            if (!cardNumber || cardNumber.length !== 16) {
                return NextResponse.json({ error: 'Invalid card number' }, { status: 400 });
            }
            if (!expiryDate || !expiryDate.match(/^\d{2}\/\d{2}$/)) {
                return NextResponse.json({ error: 'Invalid expiry date' }, { status: 400 });
            }
            if (!cvv || cvv.length !== 3) {
                return NextResponse.json({ error: 'Invalid CVV' }, { status: 400 });
            }
        }

        // Calculate expiry
        let expiresAt: Date | null = null;
        if (plan === 'pro_trial') {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
        } else if (plan === 'pro_monthly') {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
        } else if (plan === 'pro_yearly') {
            expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        }

        // Update system subscription
        const updated = updateSystemSubscription({
            plan: 'pro',
            isTrial: plan === 'pro_trial',
            companyName: companyName || 'Your Company',
            activatedAt: new Date().toISOString(),
            expiresAt: expiresAt?.toISOString() || null,
            activatedBy: userId
        });

        const message = plan === 'pro_trial'
            ? '🎉 Free trial activated! All users now have Pro features for 1 month!'
            : '🎉 System upgraded to Pro! All users now have Pro features!';

        return NextResponse.json({
            success: true,
            message,
            subscription: updated
        });
    } catch (error: any) {
        console.error('[Subscription API] Error:', error);
        return NextResponse.json({ error: 'Upgrade failed' }, { status: 500 });
    }
}
