export type RecipeSearchSortKey = 'updatedAt' | 'createdAt' | 'title';

export type RecipeSearchCursor = {
  sort: RecipeSearchSortKey;
  value: string;
  id: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/;

const SEARCH_SORTS: readonly RecipeSearchSortKey[] = ['updatedAt', 'createdAt', 'title'];

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * Quote a PostgREST `or`/`and` value.
 * Inside quotes, `\` escapes the next character (`\"` and `\\`).
 */
export function quotePostgrestValue(value: string): string {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

export function escapeIlikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export function encodeRecipeSearchCursor(cursor: RecipeSearchCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeRecipeSearchCursor(raw: string): RecipeSearchCursor | null {
  try {
    const json = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as unknown;
    if (typeof json !== 'object' || json === null) {
      return null;
    }
    if (!('sort' in json) || !('value' in json) || !('id' in json)) {
      return null;
    }
    const sort = json.sort;
    const value = json.value;
    const id = json.id;
    if (typeof sort !== 'string' || typeof value !== 'string' || typeof id !== 'string') {
      return null;
    }
    if (!SEARCH_SORTS.includes(sort as RecipeSearchSortKey) || !isUuid(id)) {
      return null;
    }
    if (sort === 'title') {
      if (value.length < 1 || value.length > 200) {
        return null;
      }
    } else if (!ISO_TIMESTAMP_PATTERN.test(value)) {
      return null;
    }
    return { sort: sort as RecipeSearchSortKey, value, id };
  } catch {
    return null;
  }
}

export function recipeSearchKeysetFilter(cursor: RecipeSearchCursor): string {
  const column =
    cursor.sort === 'createdAt' ? 'created_at' : cursor.sort === 'title' ? 'title' : 'updated_at';
  const operator = cursor.sort === 'title' ? 'gt' : 'lt';
  const value = quotePostgrestValue(cursor.value);
  const id = quotePostgrestValue(cursor.id);
  return `and(${column}.${operator}.${value}),and(${column}.eq.${value},id.${operator}.${id})`;
}

export function encodeRevisionCursor(version: number, id: string): string {
  return Buffer.from(JSON.stringify({ version, id }), 'utf8').toString('base64url');
}

export function decodeRevisionCursor(raw: string): { version: number; id: string } | null {
  try {
    const json = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as unknown;
    if (typeof json !== 'object' || json === null || !('version' in json) || !('id' in json)) {
      return null;
    }
    const version = json.version;
    const id = json.id;
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
      return null;
    }
    if (typeof id !== 'string' || !isUuid(id)) {
      return null;
    }
    return { version, id };
  } catch {
    return null;
  }
}

export function revisionKeysetFilter(version: number, id: string): string {
  return `and(version.lt.${version}),and(version.eq.${version},id.lt.${quotePostgrestValue(id)})`;
}
