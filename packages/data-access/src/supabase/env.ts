import { z } from 'zod';

const publicSupabaseEnvSchema = z.object({
  url: z.url(),
  anonKey: z.string().min(1),
});

const appUrlSchema = z.object({
  appUrl: z.url(),
});

let cachedPublic: z.infer<typeof publicSupabaseEnvSchema> | null = null;

export function getPublicSupabaseEnv(): { url: string; anonKey: string } {
  if (cachedPublic) {
    return cachedPublic;
  }
  const parsed = publicSupabaseEnvSchema.safeParse({
    url: process.env['NEXT_PUBLIC_SUPABASE_URL'],
    anonKey: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  });
  if (!parsed.success) {
    throw new Error('Missing or invalid NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  cachedPublic = parsed.data;
  return cachedPublic;
}

export function getAppUrl(): string {
  const parsed = appUrlSchema.safeParse({
    appUrl: process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3003',
  });
  if (!parsed.success) {
    throw new Error('Invalid NEXT_PUBLIC_APP_URL');
  }
  return parsed.data.appUrl.replace(/\/$/, '');
}

/** Auth cookies must be Secure on HTTPS. Local http development keeps them unset. */
export function getSupabaseAuthCookieOptions(): { secure: boolean } {
  return { secure: process.env.NODE_ENV === 'production' };
}

/**
 * Origin for the PKCE callback. Production always uses the configured app URL so a
 * spoofed Host cannot steer the email link. Outside production, localhost and
 * 127.0.0.1 on the same port are allowed so the verifier cookie matches the host
 * the browser used to request the link.
 */
export function resolveAuthAppOrigin(hostHeader: string | null | undefined): string {
  const canonical = getAppUrl();
  const host = hostHeader?.split(',')[0]?.trim().toLowerCase();
  if (!host) {
    return canonical;
  }

  const canonicalUrl = new URL(canonical);
  if (host === canonicalUrl.host.toLowerCase()) {
    return `${canonicalUrl.protocol}//${canonicalUrl.host}`;
  }

  if (process.env.NODE_ENV === 'production') {
    return canonical;
  }

  const portSuffix = canonicalUrl.port ? `:${canonicalUrl.port}` : '';
  const localHosts = [`localhost${portSuffix}`, `127.0.0.1${portSuffix}`];
  if (localHosts.includes(host)) {
    return `http://${host}`;
  }

  return canonical;
}

export function buildAuthCallbackUrl(nextPath?: string, origin?: string): string {
  const base = (origin ?? getAppUrl()).replace(/\/$/, '');
  const path = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
  return `${base}/auth/callback${path}`;
}
