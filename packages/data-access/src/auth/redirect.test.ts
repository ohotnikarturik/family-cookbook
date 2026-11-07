import { describe, expect, it } from 'vitest';

import { sanitizeAuthRedirect } from './redirect.js';

describe('sanitizeAuthRedirect', () => {
  it('allows safe relative paths', () => {
    expect(sanitizeAuthRedirect('/en/account', '/en')).toBe('/en/account');
  });

  it('rejects protocol-relative and off-site paths', () => {
    expect(sanitizeAuthRedirect('//evil.test', '/en')).toBe('/en');
    expect(sanitizeAuthRedirect('https://evil.test', '/en')).toBe('/en');
    expect(sanitizeAuthRedirect('/\\evil.test', '/en')).toBe('/en');
    expect(sanitizeAuthRedirect('/\nevil', '/en')).toBe('/en');
  });

  it('falls back when empty', () => {
    expect(sanitizeAuthRedirect('', '/en/account')).toBe('/en/account');
    expect(sanitizeAuthRedirect(undefined, '/en')).toBe('/en');
  });
});
