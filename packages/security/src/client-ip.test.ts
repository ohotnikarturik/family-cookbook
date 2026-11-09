import { describe, expect, it } from 'vitest';

import { resolveClientIp } from './client-ip.js';

describe('resolveClientIp', () => {
  it('prefers x-forwarded-for', () => {
    const ip = resolveClientIp({
      get(name) {
        if (name === 'x-forwarded-for') {
          return '203.0.113.5, 10.0.0.1';
        }
        return null;
      },
    });
    expect(ip).toBe('203.0.113.5');
  });
});
