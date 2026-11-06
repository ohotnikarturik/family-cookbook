import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@family-cookbook/application',
    '@family-cookbook/contracts',
    '@family-cookbook/data-access',
    '@family-cookbook/domain',
    '@family-cookbook/permissions',
  ],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
