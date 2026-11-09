import { describe, expect, it } from 'vitest';

import { buildSecurityHeaders } from './http-headers.js';

describe('buildSecurityHeaders', () => {
  it('includes baseline headers and CSP', () => {
    const headers = buildSecurityHeaders({
      appOrigin: 'https://app.example.com',
      supabaseOrigin: 'https://xyz.supabase.co',
      isProduction: true,
    });
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Strict-Transport-Security']).toContain('max-age');
    expect(headers['Content-Security-Policy']).toContain('https://xyz.supabase.co');
    expect(headers['Content-Security-Policy']).not.toContain('unsafe-eval');
  });

  it('allows eval and websockets in development only', () => {
    const headers = buildSecurityHeaders({
      appOrigin: 'http://localhost:3003',
      isProduction: false,
    });
    expect(headers['Content-Security-Policy']).toContain("'unsafe-eval'");
    expect(headers['Content-Security-Policy']).toContain('ws:');
    expect(headers['Strict-Transport-Security']).toBeUndefined();
  });
});
