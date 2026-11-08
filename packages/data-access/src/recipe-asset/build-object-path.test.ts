import { describe, expect, it } from 'vitest';

import { buildRecipeAssetObjectPath, recipeAssetObjectPathMatches } from './build-object-path.js';

const FAMILY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const RECIPE_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101';
const ASSET_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001';

describe('recipeAssetObjectPathMatches', () => {
  it('accepts a generated path and rejects a path for another asset', () => {
    const objectPath = buildRecipeAssetObjectPath(FAMILY_ID, RECIPE_ID, ASSET_ID);
    expect(recipeAssetObjectPathMatches(objectPath, FAMILY_ID, RECIPE_ID, ASSET_ID)).toBe(true);
    expect(
      recipeAssetObjectPathMatches(
        objectPath,
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        RECIPE_ID,
        ASSET_ID,
      ),
    ).toBe(false);
    expect(
      recipeAssetObjectPathMatches(
        `${FAMILY_ID}/${RECIPE_ID}/${ASSET_ID}/not-a-uuid`,
        FAMILY_ID,
        RECIPE_ID,
        ASSET_ID,
      ),
    ).toBe(false);
  });
});
