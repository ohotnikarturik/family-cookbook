function firstHeaderValue(raw: string | null | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }
  const first = raw.split(',')[0]?.trim();
  return first && first.length > 0 ? first : undefined;
}

/** Best-effort client IP for rate limiting (trust reverse-proxy headers when present). */
export function resolveClientIp(headers: { get(name: string): string | null }): string {
  const forwarded = firstHeaderValue(headers.get('x-forwarded-for'));
  if (forwarded) {
    return forwarded;
  }
  const realIp = firstHeaderValue(headers.get('x-real-ip'));
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}
