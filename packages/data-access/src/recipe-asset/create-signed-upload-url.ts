import {
  RECIPE_MEDIA_BUCKET_ID,
  RECIPE_UPLOAD_SIGNED_URL_TTL_SECONDS,
} from '@family-cookbook/contracts';

import type { AppSupabaseClient } from '../supabase/server.js';

export function signedUploadExpiresAt(signedUrl: string, nowMs = Date.now()): string {
  const fallback = new Date(nowMs + RECIPE_UPLOAD_SIGNED_URL_TTL_SECONDS * 1000).toISOString();
  try {
    const token = new URL(signedUrl).searchParams.get('token');
    if (!token) {
      return fallback;
    }
    const payload = token.split('.')[1];
    if (!payload) {
      return fallback;
    }
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      exp?: unknown;
    };
    if (typeof parsed.exp !== 'number' || !Number.isFinite(parsed.exp)) {
      return fallback;
    }
    return new Date(parsed.exp * 1000).toISOString();
  } catch {
    return fallback;
  }
}

export async function createRecipeSignedUploadUrl(
  client: AppSupabaseClient,
  objectPath: string,
): Promise<
  { ok: true; signedUrl: string; expiresAt: string } | { ok: false; error: 'sign_failed' }
> {
  const { data, error } = await client.storage
    .from(RECIPE_MEDIA_BUCKET_ID)
    .createSignedUploadUrl(objectPath, { upsert: false });

  if (error || !data?.signedUrl) {
    return { ok: false, error: 'sign_failed' };
  }

  return {
    ok: true,
    signedUrl: data.signedUrl,
    expiresAt: signedUploadExpiresAt(data.signedUrl),
  };
}
