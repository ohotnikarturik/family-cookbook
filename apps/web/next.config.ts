import { getPublicSupabaseEnv } from '@family-cookbook/data-access';
import { buildSecurityHeaders } from '@family-cookbook/security';
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
    '@family-cookbook/security',
  ],
  async headers() {
    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3003';
    let supabaseOrigin: string | undefined;
    try {
      supabaseOrigin = getPublicSupabaseEnv().url;
    } catch {
      supabaseOrigin = undefined;
    }
    const securityHeaders = buildSecurityHeaders({
      appOrigin: appUrl,
      ...(supabaseOrigin ? { supabaseOrigin } : {}),
      isProduction: process.env.NODE_ENV === 'production',
    });
    return [
      {
        source: '/:path*',
        headers: Object.entries(securityHeaders).map(([key, value]) => ({ key, value })),
      },
    ];
  },
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
