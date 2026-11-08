import { finalizeRecipeUpload } from '@family-cookbook/application';
import { finalizeRecipeUploadInputSchema } from '@family-cookbook/contracts';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { connection } from 'next/server';
import { NextResponse } from 'next/server';

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
    default:
      return 500;
  }
}

export async function POST(_request: Request, context: RouteContext) {
  await connection();
  const { familyId, recipeId, assetId } = await context.params;

  const parsed = finalizeRecipeUploadInputSchema.safeParse({ familyId, recipeId, assetId });
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error' }, { status: 400 });
  }

  const client = await createServerSupabaseClient();
  const result = await finalizeRecipeUpload(client, parsed.data);

  if (result.status !== 'ok') {
    return NextResponse.json(
      { error: result.status },
      { status: mapFinalizeStatus(result.status) },
    );
  }

  return NextResponse.json(result.result, { status: 200 });
}
