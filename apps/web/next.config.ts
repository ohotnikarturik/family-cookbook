import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  // Dev server hostname is localhost; 127.0.0.1 is used by local Supabase redirects and the browser.
  allowedDevOrigins: ['127.0.0.1'],
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

export default withNextIntl(nextConfig);
