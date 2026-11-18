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

  it('writes anyText back as the short query parameter', () => {
    expect(buildRecipeSearchQuery({ familyId: FAMILY_ID, anyText: 'beet soup' })).toBe(
      '?query=beet+soup',
    );
  });

  it('can drop the search text and keep the category', () => {
    expect(
      buildRecipeSearchQuery(
        { familyId: FAMILY_ID, anyText: 'soup', category: 'Dinner' },
        { anyText: undefined },
      ),
    ).toBe('?category=Dinner');
  });
});
