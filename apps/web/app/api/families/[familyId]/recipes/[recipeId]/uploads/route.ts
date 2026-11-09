import { createRecipeUploadSlot } from '@family-cookbook/application';
import { createRecipeUploadSlotInputSchema } from '@family-cookbook/contracts';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { jsonWithCors, rejectDisallowedCors } from '@/lib/web-security';
import { connection } from 'next/server';

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
    case 'rate_limited':
      return 429;
    default:
      return 500;
  }
}

export async function OPTIONS(request: Request) {
  const cors = jsonWithCors(request, null, { status: 204 });
  return cors;
}

export async function POST(request: Request, context: RouteContext) {
  const corsBlocked = rejectDisallowedCors(request);
  if (corsBlocked) {
    return corsBlocked;
  }
  await connection();
  const { familyId, recipeId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonWithCors(request, { error: 'invalid_json' }, { status: 400 });
  }

  const merged = typeof body === 'object' && body !== null ? { ...body, familyId, recipeId } : body;
  const parsed = createRecipeUploadSlotInputSchema.safeParse(merged);
  if (!parsed.success) {
    return jsonWithCors(request, { error: 'validation_error' }, { status: 400 });
  }

  const client = await createServerSupabaseClient();
  const result = await createRecipeUploadSlot(client, parsed.data);

  if (result.status !== 'ok') {
    const status = mapSlotStatus(result.status);
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

  return jsonWithCors(request, result.result, { status: 201 });
}
