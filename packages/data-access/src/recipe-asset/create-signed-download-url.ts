import {
  RECIPE_DOWNLOAD_SIGNED_URL_TTL_SECONDS,
  RECIPE_MEDIA_BUCKET_ID,
} from '@family-cookbook/contracts';

import type { AppSupabaseClient } from '../supabase/server.js';
import { signedUploadExpiresAt } from './create-signed-upload-url.js';

export async function createRecipeSignedDownloadUrl(
  client: AppSupabaseClient,
  objectPath: string,
  options: Readonly<{
    downloadFilename?: string;
  }> = {},
): Promise<
  { ok: true; signedUrl: string; expiresAt: string } | { ok: false; error: 'sign_failed' }
> {
  const downloadOption =
    options.downloadFilename !== undefined && options.downloadFilename.length > 0
      ? { download: options.downloadFilename }
      : undefined;

  const { data, error } = await client.storage
    .from(RECIPE_MEDIA_BUCKET_ID)
    .createSignedUrl(objectPath, RECIPE_DOWNLOAD_SIGNED_URL_TTL_SECONDS, downloadOption);

  if (error || !data?.signedUrl) {
    return { ok: false, error: 'sign_failed' };
  }

  return {
    ok: true,
    signedUrl: data.signedUrl,
    expiresAt: signedUploadExpiresAt(data.signedUrl),
  };
}
