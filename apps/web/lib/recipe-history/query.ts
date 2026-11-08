export type HistoryQueryParam = 'cursor' | 'auditCursor';

export type HistoryQuery = Readonly<{
  cursor?: string | undefined;
  auditCursor?: string | undefined;
}>;

export function recipeHistoryHref(familyId: string, recipeId: string, query: HistoryQuery): string {
  const params = new URLSearchParams();
  if (query.cursor) {
    params.set('cursor', query.cursor);
  }
  if (query.auditCursor) {
    params.set('auditCursor', query.auditCursor);
  }
  const encoded = params.toString();
  const base = `/f/${familyId}/recipes/${recipeId}/history`;
  return encoded.length > 0 ? `${base}?${encoded}` : base;
}

export function withHistoryParam(
  query: HistoryQuery,
  paramName: HistoryQueryParam,
  value: string | undefined,
): HistoryQuery {
  if (paramName === 'cursor') {
    return value ? { ...query, cursor: value } : { auditCursor: query.auditCursor };
  }
  return value ? { ...query, auditCursor: value } : { cursor: query.cursor };
}
