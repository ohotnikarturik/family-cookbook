import { describe, expect, it } from 'vitest';

import { recipeCoreFieldsSchema } from './recipe-core.js';
import { createRecipeInputSchema } from './recipe-create.js';
import { recipeIngredientInputSchema } from './recipe-ingredient.js';
import { recipeLanguageTagSchema } from './recipe-language.js';
import { archiveRecipeInputSchema } from './recipe-lifecycle.js';
import {
  MAX_RECIPE_INGREDIENTS,
  RECIPE_MINUTES_MAX,
  RECIPE_SERVINGS_MAX,
  RECIPE_TITLE_MAX,
  SEARCH_RECIPES_LIMIT_MAX,
} from './recipe-limits.js';
import { searchRecipesInputSchema } from './recipe-search.js';
import { recipeStepInputSchema } from './recipe-step.js';
import { updateRecipeInputSchema } from './recipe-update.js';

const FAMILY_ID = '11111111-1111-4111-8111-111111111111';
const RECIPE_ID = '11111111-1111-4111-8111-111111111112';

function emptyCollections() {
  return {
    ingredients: [],
    steps: [],
    tags: [],
    translations: [],
    ingredientTranslations: [],
    stepTranslations: [],
  };
}

describe('recipeLanguageTagSchema', () => {
  it('accepts common BCP 47 tags', () => {
    expect(recipeLanguageTagSchema.parse('fi')).toBe('fi');
    expect(recipeLanguageTagSchema.parse(' en-US ')).toBe('en-US');
  });

  it('rejects malformed language tags', () => {
    expect(recipeLanguageTagSchema.safeParse('').success).toBe(false);
    expect(recipeLanguageTagSchema.safeParse('123').success).toBe(false);
    expect(recipeLanguageTagSchema.safeParse('en_').success).toBe(false);
    expect(recipeLanguageTagSchema.safeParse('en_US').success).toBe(false);
    expect(recipeLanguageTagSchema.safeParse('a'.repeat(40)).success).toBe(false);
  });
});

describe('recipeCoreFieldsSchema', () => {
  it('rejects negative timings and non-positive servings', () => {
    const negativePrep = recipeCoreFieldsSchema.safeParse({
      title: 'Soup',
      sourceLanguage: 'fi',
      prepMinutes: -1,
    });
    expect(negativePrep.success).toBe(false);

    const negativeCook = recipeCoreFieldsSchema.safeParse({
      title: 'Soup',
      sourceLanguage: 'fi',
      cookMinutes: -1,
    });
    expect(negativeCook.success).toBe(false);

    const zeroServings = recipeCoreFieldsSchema.safeParse({
      title: 'Soup',
      sourceLanguage: 'fi',
      servings: 0,
    });
    expect(zeroServings.success).toBe(false);

    const negativeServings = recipeCoreFieldsSchema.safeParse({
      title: 'Soup',
      sourceLanguage: 'fi',
      servings: -2,
    });
    expect(negativeServings.success).toBe(false);
  });

  it('accepts numeric(8,2) servings and rejects extra scale or overflow', () => {
    expect(
      recipeCoreFieldsSchema.safeParse({
        title: 'Soup',
        sourceLanguage: 'fi',
        servings: RECIPE_SERVINGS_MAX,
      }).success,
    ).toBe(true);
    expect(
      recipeCoreFieldsSchema.safeParse({
        title: 'Soup',
        sourceLanguage: 'fi',
        servings: 4.5,
      }).success,
    ).toBe(true);
    expect(
      recipeCoreFieldsSchema.safeParse({
        title: 'Soup',
        sourceLanguage: 'fi',
        servings: 1e-7,
      }).success,
    ).toBe(false);
    expect(
      recipeCoreFieldsSchema.safeParse({
        title: 'Soup',
        sourceLanguage: 'fi',
        servings: 1.234,
      }).success,
    ).toBe(false);
    expect(
      recipeCoreFieldsSchema.safeParse({
        title: 'Soup',
        sourceLanguage: 'fi',
        servings: RECIPE_SERVINGS_MAX + 0.01,
      }).success,
    ).toBe(false);
  });

  it('rejects overlong title', () => {
    const result = recipeCoreFieldsSchema.safeParse({
      title: 'x'.repeat(RECIPE_TITLE_MAX + 1),
      sourceLanguage: 'fi',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({ code: 'too_big', origin: 'string' });
    }
  });

  it('rejects durations above the wire bound', () => {
    expect(
      recipeCoreFieldsSchema.safeParse({
        title: 'Soup',
        sourceLanguage: 'fi',
        prepMinutes: RECIPE_MINUTES_MAX + 1,
      }).success,
    ).toBe(false);
  });
});

describe('recipeStepInputSchema', () => {
  it('rejects negative durationMinutes', () => {
    expect(
      recipeStepInputSchema.safeParse({
        position: 1,
        instruction: 'Mix',
        durationMinutes: -5,
      }).success,
    ).toBe(false);
  });
});

describe('recipeIngredientInputSchema', () => {
  it('rejects negative, oversized, or over-precise quantities', () => {
    expect(
      recipeIngredientInputSchema.safeParse({
        position: 1,
        name: 'Flour',
        quantity: -1,
      }).success,
    ).toBe(false);
    expect(
      recipeIngredientInputSchema.safeParse({
        position: 1,
        name: 'Flour',
        quantity: 100_000_000,
      }).success,
    ).toBe(false);
    expect(
      recipeIngredientInputSchema.safeParse({
        position: 1,
        name: 'Flour',
        quantity: 1.23456,
      }).success,
    ).toBe(false);
    expect(
      recipeIngredientInputSchema.safeParse({
        position: 1,
        name: 'Flour',
        quantity: 1.25,
      }).success,
    ).toBe(true);
  });
});

describe('createRecipeInputSchema', () => {
  it('accepts minimal create payload', () => {
    const result = createRecipeInputSchema.safeParse({
      familyId: FAMILY_ID,
      recipe: {
        title: 'Grandma bread',
        sourceLanguage: 'fi',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects too many ingredients', () => {
    const ingredients = Array.from({ length: MAX_RECIPE_INGREDIENTS + 1 }, (_, index) => ({
      position: index + 1,
      name: `Item ${index + 1}`,
    }));
    const result = createRecipeInputSchema.safeParse({
      familyId: FAMILY_ID,
      recipe: {
        title: 'Bulk',
        sourceLanguage: 'en',
        ...emptyCollections(),
        ingredients,
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-contiguous ingredient positions', () => {
    const result = createRecipeInputSchema.safeParse({
      familyId: FAMILY_ID,
      recipe: {
        title: 'Gap test',
        sourceLanguage: 'uk',
        ...emptyCollections(),
        ingredients: [
          { position: 1, name: 'Flour' },
          { position: 3, name: 'Water' },
        ],
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects translations in the source language or with duplicate tags', () => {
    const sourceLanguage = createRecipeInputSchema.safeParse({
      familyId: FAMILY_ID,
      recipe: {
        title: 'Soup',
        sourceLanguage: 'fi',
        ...emptyCollections(),
        translations: [{ languageTag: 'fi', title: 'Keitto' }],
      },
    });
    expect(sourceLanguage.success).toBe(false);

    const duplicate = createRecipeInputSchema.safeParse({
      familyId: FAMILY_ID,
      recipe: {
        title: 'Soup',
        sourceLanguage: 'fi',
        ...emptyCollections(),
        translations: [
          { languageTag: 'en', title: 'Soup' },
          { languageTag: 'en', title: 'Broth' },
        ],
      },
    });
    expect(duplicate.success).toBe(false);
  });

  it('rejects ingredient translations that do not match a position', () => {
    const result = createRecipeInputSchema.safeParse({
      familyId: FAMILY_ID,
      recipe: {
        title: 'Soup',
        sourceLanguage: 'fi',
        ...emptyCollections(),
        ingredients: [{ position: 1, name: 'Vesi' }],
        ingredientTranslations: [{ ingredientPosition: 2, languageTag: 'en', name: 'Water' }],
      },
    });
    expect(result.success).toBe(false);
  });
});

describe('updateRecipeInputSchema', () => {
  it('rejects omitted collection arrays so a partial body cannot wipe children', () => {
    const result = updateRecipeInputSchema.safeParse({
      familyId: FAMILY_ID,
      recipeId: RECIPE_ID,
      expectedVersion: 1,
      recipe: {
        title: 'Soup',
        sourceLanguage: 'fi',
      },
    });
    expect(result.success).toBe(false);
  });

  it('accepts a full aggregate replace', () => {
    const result = updateRecipeInputSchema.safeParse({
      familyId: FAMILY_ID,
      recipeId: RECIPE_ID,
      expectedVersion: 1,
      recipe: {
        title: 'Soup',
        sourceLanguage: 'fi',
        ...emptyCollections(),
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('archiveRecipeInputSchema', () => {
  it('requires confirm: true and a positive expectedVersion', () => {
    expect(
      archiveRecipeInputSchema.safeParse({
        familyId: FAMILY_ID,
        recipeId: RECIPE_ID,
        expectedVersion: 1,
        confirm: true,
      }).success,
    ).toBe(true);
    expect(
      archiveRecipeInputSchema.safeParse({
        familyId: FAMILY_ID,
        recipeId: RECIPE_ID,
        expectedVersion: 1,
        confirm: false,
      }).success,
    ).toBe(false);
    expect(
      archiveRecipeInputSchema.safeParse({
        familyId: FAMILY_ID,
        recipeId: RECIPE_ID,
        expectedVersion: 0,
        confirm: true,
      }).success,
    ).toBe(false);
  });
});

describe('searchRecipesInputSchema', () => {
  it('enforces search limit bounds', () => {
    const base = { familyId: FAMILY_ID };
    expect(searchRecipesInputSchema.safeParse({ ...base, limit: 0 }).success).toBe(false);
    expect(searchRecipesInputSchema.safeParse({ ...base, limit: -1 }).success).toBe(false);
    expect(
      searchRecipesInputSchema.safeParse({ ...base, limit: SEARCH_RECIPES_LIMIT_MAX + 1 }).success,
    ).toBe(false);
    expect(searchRecipesInputSchema.safeParse({ ...base, limit: 25 }).success).toBe(true);
  });
});
