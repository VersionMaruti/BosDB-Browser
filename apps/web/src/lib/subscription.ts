// Subscription helper functions
// NOTE: This is for CLIENT-SIDE code. Server-side should use system-subscription.ts

// Client-side cache for system subscription status
let cachedSystemSubscription: { isPro: boolean; isTrial: boolean } | null = null;

/**
 * Fetch and cache system subscription status from server
 * Call this on app load
 */
export async function fetchSystemSubscription(): Promise<{ isPro: boolean; isTrial: boolean }> {
    try {
        const res = await fetch('/api/subscription');
        if (res.ok) {
            const data = await res.json();
            cachedSystemSubscription = { isPro: data.isPro, isTrial: data.isTrial };
            return cachedSystemSubscription;
        }
    } catch (err) {
        console.error('Failed to fetch subscription:', err);
    }
    return { isPro: false, isTrial: false };
}

/**
 * Get cached system subscription status (synchronous)
 */
export function getSystemSubscriptionStatus(): { isPro: boolean; isTrial: boolean } {
    return cachedSystemSubscription || { isPro: false, isTrial: false };
}

/**
 * Check if system has Pro (use cached value)
 * For enterprise model - applies to ALL users
 */
export function isPro(): boolean {
    return cachedSystemSubscription?.isPro ?? false;
}

/**
 * Check if system is on trial
 */
export function isTrial(): boolean {
    return cachedSystemSubscription?.isTrial ?? false;
}

/**
 * Feature names that require Pro subscription
 */
export const PRO_FEATURES = [
    'version_control',
    'commit_history',
    'table_designer',
    'data_editing',
    'granular_permissions',
    'unlimited_connections',
    'json_export',
    'sql_export'
] as const;

export const FREE_FEATURES = [
    'basic_query',
    'csv_export',
    'schema_explorer',
    'query_history_limited' // 50 entries max
] as const;

/**
 * Check if a feature is available (based on system subscription)
 */
export function canUseFeature(feature: string): boolean {
    // Free features are always available
    if ((FREE_FEATURES as readonly string[]).includes(feature)) {
        return true;
    }

    // Pro features require system subscription
    if ((PRO_FEATURES as readonly string[]).includes(feature)) {
        return isPro();
    }

    // Unknown feature - default to requiring Pro
    return isPro();
}

/**
 * Get subscription status text for display
 */
export function getSubscriptionStatusText(): string {
    const status = getSystemSubscriptionStatus();
    if (!status.isPro) {
        return 'Free Plan';
    }
    if (status.isTrial) {
        return 'Trial (1 month free)';
    }
    return 'Pro';
}

/**
 * Pricing info
 */
export const PRICING = {
    free: {
        name: 'Free',
        price: 0,
        period: 'forever',
        features: [
            '2 Database Connections',
            '50 Query History Entries',
            'Schema Explorer',
            'CSV Export',
            'Basic Query Editor'
        ]
    },
    pro_trial: {
        name: 'Pro Trial',
        price: 0,
        period: '1 month',
        features: [
            'All Pro features FREE for 1 month',
            'No credit card required',
            'Cancel anytime'
        ]
    },
    pro_monthly: {
        name: 'Pro Monthly',
        price: 29,
        period: 'month',
        features: [
            'Unlimited Connections',
            'Unlimited Query History',
            'Version Control & Commits',
            'Table Designer',
            'Data Grid Editing',
            'Granular Permissions',
            'CSV, JSON, SQL Export',
            'Priority Support'
        ]
    },
    pro_yearly: {
        name: 'Pro Yearly',
        price: 249,
        period: 'year',
        savings: '29%',
        features: [
            'All Pro Monthly features',
            '2 months FREE',
            'Priority Support'
        ]
    }
};
