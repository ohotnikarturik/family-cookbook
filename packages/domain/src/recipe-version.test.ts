import { describe, expect, it } from 'vitest';

import { isRecipeVersionConflict, recipeVersionMatches } from './recipe-version.js';

describe('recipe version helpers', () => {
  it('detects version conflicts', () => {
    expect(isRecipeVersionConflict(2, 3)).toBe(true);
    expect(isRecipeVersionConflict(2, 2)).toBe(false);
  });

  it('matches equal versions', () => {
    expect(recipeVersionMatches(5, 5)).toBe(true);
    expect(recipeVersionMatches(5, 4)).toBe(false);
  });
});
