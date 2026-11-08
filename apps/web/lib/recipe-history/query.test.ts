import { describe, expect, it } from 'vitest';

import { recipeHistoryHref, withHistoryParam } from './query';

const FAMILY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const RECIPE_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101';

describe('recipe history query', () => {
  it('omits an empty query', () => {
    expect(recipeHistoryHref(FAMILY_ID, RECIPE_ID, {})).toBe(
      `/f/${FAMILY_ID}/recipes/${RECIPE_ID}/history`,
    );
  });

  it('keeps the security-log cursor when the revision page changes', () => {
    const preserved = { auditCursor: 'audit-1' };
    expect(
      recipeHistoryHref(FAMILY_ID, RECIPE_ID, withHistoryParam(preserved, 'cursor', 'rev-2')),
    ).toBe(`/f/${FAMILY_ID}/recipes/${RECIPE_ID}/history?cursor=rev-2&auditCursor=audit-1`);
    expect(
      recipeHistoryHref(FAMILY_ID, RECIPE_ID, withHistoryParam(preserved, 'cursor', undefined)),
    ).toBe(`/f/${FAMILY_ID}/recipes/${RECIPE_ID}/history?auditCursor=audit-1`);
  });

  it('keeps the revision cursor when the security log page changes', () => {
    const preserved = { cursor: 'rev-2' };
    expect(
      recipeHistoryHref(
        FAMILY_ID,
        RECIPE_ID,
        withHistoryParam(preserved, 'auditCursor', 'audit-2'),
      ),
    ).toBe(`/f/${FAMILY_ID}/recipes/${RECIPE_ID}/history?cursor=rev-2&auditCursor=audit-2`);
    expect(
      recipeHistoryHref(
        FAMILY_ID,
        RECIPE_ID,
        withHistoryParam(preserved, 'auditCursor', undefined),
      ),
    ).toBe(`/f/${FAMILY_ID}/recipes/${RECIPE_ID}/history?cursor=rev-2`);
  });

  it('encodes cursor values', () => {
    expect(recipeHistoryHref(FAMILY_ID, RECIPE_ID, { cursor: 'a b&c' })).toBe(
      `/f/${FAMILY_ID}/recipes/${RECIPE_ID}/history?cursor=a+b%26c`,
    );
  });
});
