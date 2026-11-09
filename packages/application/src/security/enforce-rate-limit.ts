import { consumeRateLimit, isRateLimited, type RateLimitPolicyId } from '@family-cookbook/security';

export function isWithinRateLimit(policy: RateLimitPolicyId, subject: string): boolean {
  return !isRateLimited(consumeRateLimit(policy, subject));
}

export function enforceRateLimit(
  policy: RateLimitPolicyId,
  subject: string,
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const result = consumeRateLimit(policy, subject);
  if (result.allowed) {
    return { ok: true };
  }
  return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(result.retryAfterMs / 1000)) };
}
