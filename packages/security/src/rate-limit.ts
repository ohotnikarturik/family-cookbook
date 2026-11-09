export type RateLimitPolicyId =
  | 'auth_magic_link_ip'
  | 'auth_magic_link_email'
  | 'auth_otp_ip'
  | 'auth_otp_email'
  | 'invitation_create'
  | 'invitation_accept'
  | 'upload_slot'
  | 'upload_finalize'
  | 'recipe_search';

export type RateLimitPolicy = {
  readonly max: number;
  readonly windowMs: number;
};

export const RATE_LIMIT_POLICIES: Record<RateLimitPolicyId, RateLimitPolicy> = {
  auth_magic_link_ip: { max: 12, windowMs: 15 * 60 * 1000 },
  auth_magic_link_email: { max: 5, windowMs: 15 * 60 * 1000 },
  auth_otp_ip: { max: 24, windowMs: 15 * 60 * 1000 },
  auth_otp_email: { max: 10, windowMs: 15 * 60 * 1000 },
  invitation_create: { max: 30, windowMs: 60 * 60 * 1000 },
  invitation_accept: { max: 20, windowMs: 60 * 60 * 1000 },
  upload_slot: { max: 60, windowMs: 60 * 60 * 1000 },
  upload_finalize: { max: 60, windowMs: 60 * 60 * 1000 },
  recipe_search: { max: 120, windowMs: 60 * 1000 },
};

type Bucket = { count: number; windowStart: number };

export type RateLimitConsumeResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

export type RateLimiter = {
  consume(policy: RateLimitPolicyId, subject: string): RateLimitConsumeResult;
  resetForTests?(): void;
};

function bucketKey(policy: RateLimitPolicyId, subject: string): string {
  return `${policy}:${subject}`;
}

export function createRateLimiter(): RateLimiter {
  const buckets = new Map<string, Bucket>();

  return {
    consume(policy, subject) {
      const { max, windowMs } = RATE_LIMIT_POLICIES[policy];
      const key = bucketKey(policy, subject);
      const now = Date.now();
      const existing = buckets.get(key);
      if (!existing || now - existing.windowStart >= windowMs) {
        buckets.set(key, { count: 1, windowStart: now });
        return { allowed: true };
      }
      if (existing.count >= max) {
        return {
          allowed: false,
          retryAfterMs: Math.max(0, windowMs - (now - existing.windowStart)),
        };
      }
      existing.count += 1;
      return { allowed: true };
    },
    resetForTests() {
      buckets.clear();
    },
  };
}

const defaultLimiter = createRateLimiter();

export function consumeRateLimit(
  policy: RateLimitPolicyId,
  subject: string,
  limiter: RateLimiter = defaultLimiter,
): RateLimitConsumeResult {
  return limiter.consume(policy, subject);
}

export function isRateLimited(result: RateLimitConsumeResult): boolean {
  return !result.allowed;
}
