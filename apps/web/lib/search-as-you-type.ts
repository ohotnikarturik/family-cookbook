/** Wait this long after the last keystroke before searching. */
export const SEARCH_DEBOUNCE_MS = 300;

/** Fewest characters that start a search by typing alone. Enter and the button accept fewer. */
export const SEARCH_MIN_CHARACTERS = 2;

export type SearchTrigger = 'clear' | 'wait' | 'search';

/**
 * What typing in the search box should do: show everything again (empty), do nothing yet (too
 * short) or search. Characters are counted as Unicode code points, so one emoji is one character.
 */
export function searchTrigger(text: string): SearchTrigger {
  const length = Array.from(text.trim()).length;
  if (length === 0) {
    return 'clear';
  }
  return length < SEARCH_MIN_CHARACTERS ? 'wait' : 'search';
}

/** Values of the browse controls, as the address bar spells them. */
export type BrowseFields = Readonly<{
  query: string;
  ingredient?: string | undefined;
  category: string;
  tag: string;
  language: string;
  createdBy: string;
  sort: string;
  includeArchived: boolean;
}>;

const FIELD_ORDER = [
  'query',
  'ingredient',
  'category',
  'tag',
  'language',
  'createdBy',
  'sort',
] as const satisfies readonly (keyof BrowseFields)[];

/**
 * Query string (without "?") for the recipes page. Empty values, the default sort and `cursor`
 * are left out, so a new search starts on the first page and equal searches give equal strings.
 */
export function browseQueryString(fields: BrowseFields): string {
  const params = new URLSearchParams();
  for (const key of FIELD_ORDER) {
    const value = fields[key]?.trim() ?? '';
    if (value === '' || (key === 'sort' && value === 'updatedAt')) {
      continue;
    }
    params.set(key, value);
  }
  if (fields.includeArchived) {
    params.set('includeArchived', 'true');
  }
  return params.toString();
}

/** The same fields read back from the address bar (unknown or repeated keys are ignored). */
export function browseFieldsFromUrl(params: URLSearchParams): BrowseFields {
  const read = (key: string) => params.get(key) ?? '';
  const archived = read('includeArchived');
  return {
    query: read('query'),
    ingredient: read('ingredient'),
    category: read('category'),
    tag: read('tag'),
    language: read('language'),
    createdBy: read('createdBy'),
    sort: read('sort') || 'updatedAt',
    includeArchived: archived === 'true' || archived === '1',
  };
}
