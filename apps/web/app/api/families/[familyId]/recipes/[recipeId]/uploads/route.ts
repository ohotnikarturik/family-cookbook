import { createRecipeUploadSlot } from '@family-cookbook/application';
import { createRecipeUploadSlotInputSchema } from '@family-cookbook/contracts';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { connection } from 'next/server';
import { NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ familyId: string; recipeId: string }>;
};

function mapSlotStatus(
  status: Awaited<ReturnType<typeof createRecipeUploadSlot>>['status'],
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
    case 'limit_reached':
      return 409;
    default:
      return 500;
  }
}

export async function POST(request: Request, context: RouteContext) {
  await connection();
  const { familyId, recipeId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const merged = typeof body === 'object' && body !== null ? { ...body, familyId, recipeId } : body;
  const parsed = createRecipeUploadSlotInputSchema.safeParse(merged);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error' }, { status: 400 });
  }

  const client = await createServerSupabaseClient();
  const result = await createRecipeUploadSlot(client, parsed.data);

  if (result.status !== 'ok') {
    return NextResponse.json({ error: result.status }, { status: mapSlotStatus(result.status) });
  }

  return NextResponse.json(result.result, { status: 201 });
}
