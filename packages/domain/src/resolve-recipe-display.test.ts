import { describe, expect, it } from 'vitest';

import { resolveRecipeDisplay, type RecipeForDisplay } from './resolve-recipe-display.js';

const base: RecipeForDisplay = {
  title: 'Original',
  description: 'Orig desc',
  notes: null,
  sourceLanguage: 'fi',
  ingredients: [{ position: 1, name: 'Flour', notes: null }],
  steps: [{ position: 1, instruction: 'Mix' }],
  translations: [
    {
      languageTag: 'en',
      title: 'Translated',
      description: 'EN desc',
      notes: null,
      reviewStatus: 'reviewed',
    },
  ],
  ingredientTranslations: [
    { ingredientPosition: 1, languageTag: 'en', name: 'Wheat flour', notes: null },
  ],
  stepTranslations: [{ stepPosition: 1, languageTag: 'en', instruction: 'Stir' }],
};

describe('resolveRecipeDisplay', () => {
  it('returns original when view language is source', () => {
    const resolved = resolveRecipeDisplay(base, 'fi');
    expect(resolved.mode).toBe('original');
    expect(resolved.title).toBe('Original');
  });

  it('overlays translation fields when language matches', () => {
    const resolved = resolveRecipeDisplay(base, 'en');
    expect(resolved.mode).toBe('translation');
    expect(resolved.title).toBe('Translated');
    expect(resolved.ingredients[0]?.name).toBe('Wheat flour');
    expect(resolved.translationReviewStatus).toBe('reviewed');
  });

  it('falls back to original lines when step translation missing', () => {
    const resolved = resolveRecipeDisplay(
      {
        ...base,
        stepTranslations: [],
      },
      'en',
    );
    expect(resolved.steps[0]?.instruction).toBe('Mix');
    expect(resolved.steps[0]?.usedFallback).toBe(true);
  });

  it('keeps original notes when the translation leaves them empty', () => {
    const resolved = resolveRecipeDisplay(
      {
        ...base,
        ingredients: [{ position: 1, name: 'Flour', notes: 'Sifted' }],
        ingredientTranslations: [
          { ingredientPosition: 1, languageTag: 'en', name: 'Wheat flour', notes: null },
        ],
      },
      'en',
    );
    expect(resolved.ingredients[0]?.notes).toBe('Sifted');
    expect(resolved.ingredients[0]?.notesFallback).toBe(true);
    expect(resolved.ingredients[0]?.usedFallback).toBe(false);
  });

  it('uses original when unknown language requested', () => {
    const resolved = resolveRecipeDisplay(base, 'uk');
    expect(resolved.title).toBe('Original');
    expect(resolved.mode).toBe('original');
  });
});
