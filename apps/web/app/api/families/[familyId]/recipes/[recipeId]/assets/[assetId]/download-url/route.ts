import { createRecipeAssetDownloadUrl } from '@family-cookbook/application';
import { recipeAssetDownloadInputSchema } from '@family-cookbook/contracts';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { connection } from 'next/server';
import { NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ familyId: string; recipeId: string; assetId: string }>;
};

function mapDownloadStatus(
  status: Awaited<ReturnType<typeof createRecipeAssetDownloadUrl>>['status'],
): number {
  switch (status) {
    case 'auth_required':
      return 401;
    case 'validation_error':
      return 400;
    case 'forbidden':
      return 403;
    case 'not_found':
      return 404;
    case 'unavailable':
      return 409;
    case 'query_failed':
    case 'sign_failed':
      return 500;
    default:
      return 500;
  }
}

function downloadJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
    },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  await connection();
  const { familyId, recipeId, assetId } = await context.params;

  const parsed = recipeAssetDownloadInputSchema.safeParse({ familyId, recipeId, assetId });
  if (!parsed.success) {
    return downloadJson({ error: 'validation_error' }, 400);
  }

  const client = await createServerSupabaseClient();
  const result = await createRecipeAssetDownloadUrl(client, parsed.data);

  if (result.status !== 'ok') {
    return downloadJson({ error: result.status }, mapDownloadStatus(result.status));
  }

  return downloadJson(result.result);
}
