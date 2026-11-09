import { describe, expect, it, vi, afterEach } from 'vitest';

import { RATE_LIMIT_POLICIES, createRateLimiter } from './rate-limit.js';

describe('createRateLimiter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests within the policy window', () => {
    const limiter = createRateLimiter();
    const { max } = RATE_LIMIT_POLICIES.recipe_search;
    for (let i = 0; i < max; i += 1) {
      expect(limiter.consume('recipe_search', 'user-1')).toEqual({ allowed: true });
    }
  });

  it('blocks when the window is exhausted', () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter();
    const policy = RATE_LIMIT_POLICIES.auth_magic_link_email;
    for (let i = 0; i < policy.max; i += 1) {
      expect(limiter.consume('auth_magic_link_email', 'a@example.com').allowed).toBe(true);
    }
    const blocked = limiter.consume('auth_magic_link_email', 'a@example.com');
    expect(blocked).toMatchObject({ allowed: false, retryAfterMs: expect.any(Number) });
    vi.advanceTimersByTime(policy.windowMs + 1);
    expect(limiter.consume('auth_magic_link_email', 'a@example.com')).toEqual({ allowed: true });
  });
});
