import { getAppUrl, getPublicSupabaseEnv } from '@family-cookbook/data-access';
import {
  applySecurityHeadersToHeaders,
  evaluateCorsRequest,
  corsHeadersForAllowedOrigin,
  resolveClientIp,
  consumeRateLimit,
  isRateLimited,
  type RateLimitPolicyId,
} from '@family-cookbook/security';
import { headers } from 'next/headers';

function securityHeaderOptions() {
  let supabaseOrigin: string | undefined;
  try {
    supabaseOrigin = getPublicSupabaseEnv().url;
  } catch {
    supabaseOrigin = undefined;
  }
  return {
    appOrigin: getAppUrl(),
    ...(supabaseOrigin ? { supabaseOrigin } : {}),
    isProduction: process.env.NODE_ENV === 'production',
  };
}

export function applyWebSecurityHeaders(target: Headers): void {
  applySecurityHeadersToHeaders(target, securityHeaderOptions());
}

export async function clientIpFromRequestHeaders(): Promise<string> {
  const h = await headers();
  return resolveClientIp(h);
}

export async function enforceWebRateLimit(
  policy: RateLimitPolicyId,
  subject: string,
): Promise<boolean> {
  return !isRateLimited(consumeRateLimit(policy, subject));
}

export function allowedCorsOrigins(): string[] {
  const origins = [getAppUrl()];
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3003', 'http://127.0.0.1:3003');
  }
  return origins;
}

export function apiCorsHeaders(request: Request): HeadersInit | null {
  const decision = evaluateCorsRequest(request.headers.get('origin'), allowedCorsOrigins());
  if (!decision.allowed) {
    return null;
  }
  return corsHeadersForAllowedOrigin(decision.origin);
}

export function jsonWithCors(
  request: Request,
  body: unknown,
  init: { status: number; headers?: HeadersInit },
): Response {
  const cors = apiCorsHeaders(request);
  const responseHeaders = new Headers(init.headers);
  if (cors) {
    for (const [key, value] of Object.entries(cors)) {
      responseHeaders.set(key, value);
    }
  }
  // 204/205 cannot have a JSON body; Response.json throws in Node/undici.
  if (init.status === 204 || init.status === 205) {
    return new Response(null, { status: init.status, headers: responseHeaders });
  }
  return Response.json(body, { status: init.status, headers: responseHeaders });
}

export function rejectDisallowedCors(request: Request): Response | null {
  if (request.method === 'GET') {
    return null;
  }
  const origin = request.headers.get('origin');
  if (!origin) {
    return null;
  }
  const decision = evaluateCorsRequest(origin, allowedCorsOrigins());
  if (decision.allowed) {
    return null;
  }
  return Response.json({ error: 'cors_forbidden' }, { status: 403 });
}
