import {
  auditEventMetadataSchema,
  auditEventSummarySchema,
  RECIPE_HISTORY_LIMIT_MAX,
  recipeAuditResultSchema,
  type GetRecipeAuditInput,
  type RecipeAuditResult,
} from '@family-cookbook/contracts';

import type { AppSupabaseClient } from '../supabase/server.js';
import {
  auditKeysetFilter,
  decodeAuditCursor,
  encodeAuditCursor,
} from '../recipe/search-cursor.js';

const DEFAULT_AUDIT_LIMIT = 25;

function parseAuditMetadata(
  raw: unknown,
): ReturnType<typeof auditEventMetadataSchema.parse> | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const recipeId = record.recipe_id ?? record.recipeId;
  const version = record.version;
  const parsed = auditEventMetadataSchema.safeParse({ recipeId, version });
  return parsed.success ? parsed.data : null;
}

export async function listRecipeAuditEvents(
  client: AppSupabaseClient,
  input: GetRecipeAuditInput,
): Promise<
  { ok: true; result: RecipeAuditResult } | { ok: false; error: 'query_failed' | 'invalid_row' }
> {
  const limit = Math.min(input.limit ?? DEFAULT_AUDIT_LIMIT, RECIPE_HISTORY_LIMIT_MAX);
  const fetchLimit = limit + 1;

  let query = client
    .from('audit_events')
    .select(
      'id, family_id, actor_user_id, event_type, entity_type, entity_id, metadata, created_at',
    )
    .eq('family_id', input.familyId)
    .eq('entity_type', 'recipe')
    .eq('entity_id', input.recipeId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  if (input.cursor) {
    const decoded = decodeAuditCursor(input.cursor);
    if (decoded) {
      query = query.or(auditKeysetFilter(decoded.createdAt, decoded.id));
    }
  }

  const { data, error } = await query.limit(fetchLimit);

  if (error) {
    return { ok: false, error: 'query_failed' };
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const items = [];
  for (const row of page) {
    const metadata = parseAuditMetadata(row.metadata);
    if (!metadata) {
      return { ok: false, error: 'invalid_row' };
    }
    const candidate = {
      id: row.id as string,
      familyId: row.family_id as string,
      actorUserId: (row.actor_user_id as string | null) ?? null,
      eventType: row.event_type as string,
      entityType: row.entity_type as string,
      entityId: (row.entity_id as string | null) ?? null,
      metadata,
      createdAt: row.created_at as string,
    };
    const parsed = auditEventSummarySchema.safeParse(candidate);
    if (!parsed.success) {
      return { ok: false, error: 'invalid_row' };
    }
    items.push(parsed.data);
  }

  let nextCursor: string | null = null;
  if (hasMore && page.length > 0) {
    const last = page[page.length - 1];
    if (last) {
      nextCursor = encodeAuditCursor(last.created_at as string, last.id as string);
    }
  }

  const result = { items, nextCursor };
  const validated = recipeAuditResultSchema.safeParse(result);
  if (!validated.success) {
    return { ok: false, error: 'invalid_row' };
  }

  return { ok: true, result: validated.data };
}
