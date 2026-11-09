import { describe, expect, it } from 'vitest';

import { buildRecipeSearchQuery } from './build-recipe-search-query';

const FAMILY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OWNER_A = '11111111-1111-4111-8111-111111111101';

describe('buildRecipeSearchQuery', () => {
  it('includes createdBy in query string', () => {
    const query = buildRecipeSearchQuery({
      familyId: FAMILY_ID,
      createdBy: OWNER_A,
    });
    expect(query).toBe(`?createdBy=${OWNER_A}`);
  });
});
