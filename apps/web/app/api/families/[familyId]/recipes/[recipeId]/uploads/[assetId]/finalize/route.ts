import { finalizeRecipeUpload } from '@family-cookbook/application';
import { finalizeRecipeUploadInputSchema } from '@family-cookbook/contracts';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { jsonWithCors, rejectDisallowedCors } from '@/lib/web-security';
import { connection } from 'next/server';

type RouteContext = {
  params: Promise<{ familyId: string; recipeId: string; assetId: string }>;
};

function mapFinalizeStatus(
  status: Awaited<ReturnType<typeof finalizeRecipeUpload>>['status'],
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
    case 'rejected':
      return 422;
    case 'rate_limited':
      return 429;
    default:
      return 500;
  }
}

export async function OPTIONS(request: Request) {
  return jsonWithCors(request, null, { status: 204 });
}

export async function POST(request: Request, context: RouteContext) {
  const corsBlocked = rejectDisallowedCors(request);
  if (corsBlocked) {
    return corsBlocked;
  }
  await connection();
  const { familyId, recipeId, assetId } = await context.params;

  const parsed = finalizeRecipeUploadInputSchema.safeParse({ familyId, recipeId, assetId });
  if (!parsed.success) {
    return jsonWithCors(request, { error: 'validation_error' }, { status: 400 });
  }

  const client = await createServerSupabaseClient();
  const result = await finalizeRecipeUpload(client, parsed.data);

  if (result.status !== 'ok') {
    const status = mapFinalizeStatus(result.status);
    if (result.status === 'rate_limited') {
      return jsonWithCors(
        request,
        { error: result.status },
        {
          status,
          headers: { 'Retry-After': String(result.retryAfterSeconds) },
        },
      );
    }
    return jsonWithCors(request, { error: result.status }, { status });
  }

  return jsonWithCors(request, result.result, { status: 200 });
}
