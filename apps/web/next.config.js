/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    transpilePackages: ['@bosdb/core', '@bosdb/db-adapters', '@bosdb/security', '@bosdb/utils'],
    serverExternalPackages: [
        'pg',
        'mysql2',
        'lru.min',
        'seq-queue',
        'aws-ssl-profiles',
        'long',
        'named-placeholders'
    ],
    // Use standalone for production deployment
    output: 'standalone',
    // Skip generating static error pages
    generateBuildId: async () => 'build-id',
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
            };
        }
        return config;
    },
};

module.exports = nextConfig;
