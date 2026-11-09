import { describe, expect, it } from 'vitest';

import { redactLogFields, redactLogText } from './redact.js';

describe('redactLogText', () => {
  it('redacts bearer tokens and jwt-like strings', () => {
    const input = 'Authorization: Bearer secret-token-123 and eyJhbGciOiJIUzI1NiJ9.payload.sig';
    expect(redactLogText(input)).toBe('Authorization: Bearer [redacted] and [redacted-jwt]');
  });
});

describe('redactLogFields', () => {
  it('masks sensitive keys', () => {
    expect(redactLogFields({ token: 'abcdefghijklmnop', route: '/recipes' })).toEqual({
      token: 'abcd…op',
      route: '/recipes',
    });
  });
});
