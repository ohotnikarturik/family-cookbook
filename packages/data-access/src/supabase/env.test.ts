import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildAuthCallbackUrl, getSupabaseAuthCookieOptions, resolveAuthAppOrigin } from './env.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('auth app origin', () => {
  it('follows localhost or 127.0.0.1 outside production and ignores other hosts', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3003');

    expect(resolveAuthAppOrigin('localhost:3003')).toBe('http://localhost:3003');
    expect(resolveAuthAppOrigin('127.0.0.1:3003')).toBe('http://127.0.0.1:3003');
    expect(resolveAuthAppOrigin('evil.test')).toBe('http://localhost:3003');
    expect(resolveAuthAppOrigin(null)).toBe('http://localhost:3003');
  });

  it('uses only the configured app URL in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://cookbook.example');

    expect(resolveAuthAppOrigin('cookbook.example')).toBe('https://cookbook.example');
    expect(resolveAuthAppOrigin('127.0.0.1:3003')).toBe('https://cookbook.example');
    expect(resolveAuthAppOrigin('evil.test')).toBe('https://cookbook.example');
  });

  it('builds the callback on the chosen origin', () => {
    expect(buildAuthCallbackUrl('/en/account', 'http://127.0.0.1:3003')).toBe(
      'http://127.0.0.1:3003/auth/callback?next=%2Fen%2Faccount',
    );
  });
});

describe('getSupabaseAuthCookieOptions', () => {
  it('marks cookies secure in production only', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(getSupabaseAuthCookieOptions()).toEqual({ secure: true });

    vi.stubEnv('NODE_ENV', 'test');
    expect(getSupabaseAuthCookieOptions()).toEqual({ secure: false });
  });
});
