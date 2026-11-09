function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, '').toLowerCase();
}

export type CorsDecision =
  | { allowed: true; origin: string }
  | { allowed: false; reason: 'missing_origin' | 'origin_mismatch' };

export function evaluateCorsRequest(
  requestOrigin: string | null,
  allowedOrigins: readonly string[],
): CorsDecision {
  if (!requestOrigin) {
    return { allowed: false, reason: 'missing_origin' };
  }
  const normalizedRequest = normalizeOrigin(requestOrigin);
  const match = allowedOrigins.map(normalizeOrigin).find((o) => o === normalizedRequest);
  if (!match) {
    return { allowed: false, reason: 'origin_mismatch' };
  }
  return { allowed: true, origin: requestOrigin };
}

export function corsHeadersForAllowedOrigin(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
