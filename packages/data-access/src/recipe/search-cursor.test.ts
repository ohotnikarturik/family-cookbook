import { describe, expect, it } from 'vitest';

import {
  auditKeysetFilter,
  decodeAuditCursor,
  decodeRecipeSearchCursor,
  decodeRevisionCursor,
  encodeAuditCursor,
  encodeRecipeSearchCursor,
  quotePostgrestValue,
  recipeSearchKeysetFilter,
  revisionKeysetFilter,
} from './search-cursor.js';

const RECIPE_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0001';

describe('recipe search cursors', () => {
  it('quotes filter values that contain PostgREST separators', () => {
    expect(quotePostgrestValue('Soup, hot "bread"')).toBe('"Soup, hot \\"bread\\""');
    expect(quotePostgrestValue('a\\b')).toBe('"a\\\\b"');
    const title = 'Soup, hot "bread"';
    const quoted = quotePostgrestValue(title);
    expect(recipeSearchKeysetFilter({ sort: 'title', value: title, id: RECIPE_ID })).toBe(
      `and(title.gt.${quoted}),and(title.eq.${quoted},id.gt.${quotePostgrestValue(RECIPE_ID)})`,
    );
    expect(
      decodeRecipeSearchCursor(
        encodeRecipeSearchCursor({
          sort: 'updatedAt',
          value: '2026-11-08T01:25:00.123456+00:00',
          id: RECIPE_ID,
        }),
      ),
    ).toEqual({
      sort: 'updatedAt',
      value: '2026-11-08T01:25:00.123456+00:00',
      id: RECIPE_ID,
    });
  });

  it('rejects cursors that could rewrite the filter', () => {
    const injected = Buffer.from(
      JSON.stringify({
        sort: 'updatedAt',
        value: '2026-11-08T01:25:00.123456+00:00',
        id: `${RECIPE_ID}),role.eq.authenticated`,
      }),
      'utf8',
    ).toString('base64url');
    expect(decodeRecipeSearchCursor(injected)).toBeNull();
    expect(
      decodeRecipeSearchCursor(
        encodeRecipeSearchCursor({
          sort: 'title',
          value: 'x'.repeat(201),
          id: RECIPE_ID,
        }),
      ),
    ).toBeNull();
  });
});

describe('revision cursors', () => {
  it('builds a keyset filter from a validated cursor only', () => {
    expect(revisionKeysetFilter(4, RECIPE_ID)).toBe(
      `and(version.lt.4),and(version.eq.4,id.lt.${quotePostgrestValue(RECIPE_ID)})`,
    );
    const injected = Buffer.from(JSON.stringify({ version: 4, id: 'not-a-uuid' }), 'utf8').toString(
      'base64url',
    );
    expect(decodeRevisionCursor(injected)).toBeNull();
  });
});

describe('audit cursors', () => {
  const createdAt = '2026-11-08T01:25:00.123456+00:00';

  it('round-trips audit cursors', () => {
    const cursor = encodeAuditCursor(createdAt, RECIPE_ID);
    expect(decodeAuditCursor(cursor)).toEqual({ createdAt, id: RECIPE_ID });
    expect(auditKeysetFilter(createdAt, RECIPE_ID)).toBe(
      `and(created_at.lt.${quotePostgrestValue(createdAt)}),and(created_at.eq.${quotePostgrestValue(createdAt)},id.lt.${quotePostgrestValue(RECIPE_ID)})`,
    );
  });

  it('rejects malformed audit cursors', () => {
    expect(decodeAuditCursor('not-base64')).toBeNull();
    const injected = Buffer.from(
      JSON.stringify({ createdAt: 'not-a-ts', id: RECIPE_ID }),
      'utf8',
    ).toString('base64url');
    expect(decodeAuditCursor(injected)).toBeNull();
  });
});
