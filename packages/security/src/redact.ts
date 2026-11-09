const JWT_LIKE = /\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]+\b/gi;
const COOKIE_PAIR = /\b(?:sb-[\w-]+-auth-token|fc-[a-z-]+)=[^;\s]+/gi;
const INVITE_TOKEN = /\b(?:invite|invitation)[_-]?token[=:]\s*[\w-]{20,}\b/gi;
const SIGNED_URL_QUERY = /[?&]token=[^&\s]+/gi;

function maskMiddle(value: string, keepStart = 4, keepEnd = 2): string {
  if (value.length <= keepStart + keepEnd + 2) {
    return '[redacted]';
  }
  return `${value.slice(0, keepStart)}…${value.slice(-keepEnd)}`;
}

/** Redact sensitive material from free-form log text. */
export function redactLogText(input: string): string {
  let out = input;
  out = out.replace(BEARER, 'Bearer [redacted]');
  out = out.replace(JWT_LIKE, '[redacted-jwt]');
  out = out.replace(COOKIE_PAIR, (match) => `${match.split('=')[0]}=[redacted]`);
  out = out.replace(INVITE_TOKEN, 'invitation_token=[redacted]');
  out = out.replace(SIGNED_URL_QUERY, (match) =>
    match.startsWith('?') ? '?token=[redacted]' : '&token=[redacted]',
  );
  return out;
}

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'access_token',
  'refresh_token',
  'token',
  'invitation_token',
  'password',
  'otp',
  'email',
  'signed_url',
  'signedUrl',
]);

export function redactLogValue(key: string, value: unknown): unknown {
  const normalized = key.toLowerCase();
  if (SENSITIVE_KEYS.has(normalized)) {
    if (typeof value === 'string') {
      return maskMiddle(value);
    }
    return '[redacted]';
  }
  if (typeof value === 'string') {
    return redactLogText(value);
  }
  return value;
}

/** Shallow copy of fields safe for structured logs. */
export function redactLogFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) {
      continue;
    }
    out[key] = redactLogValue(key, value);
  }
  return out;
}
