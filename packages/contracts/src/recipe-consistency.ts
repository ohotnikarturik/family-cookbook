import type { z } from 'zod';

import { assertContiguousOneBasedPositions } from './recipe-positions.js';

type TagAttach = { tagId: string } | { name: string };

type RecipePayloadCollections = {
  sourceLanguage: string;
  ingredients: Array<{ position: number }>;
  steps: Array<{ position: number }>;
  tags: TagAttach[];
  translations: Array<{ languageTag: string }>;
  ingredientTranslations: Array<{ ingredientPosition: number; languageTag: string }>;
  stepTranslations: Array<{ stepPosition: number; languageTag: string }>;
};

function addCustomIssue(ctx: z.RefinementCtx, message: string, path: Array<string | number>): void {
  ctx.addIssue({
    code: 'custom',
    message,
    path,
  });
}

function assertUniqueKeys(
  ctx: z.RefinementCtx,
  keys: Array<{ key: string; path: Array<string | number> }>,
  message: string,
): void {
  const seen = new Set<string>();
  for (const item of keys) {
    if (seen.has(item.key)) {
      addCustomIssue(ctx, message, item.path);
      continue;
    }
    seen.add(item.key);
  }
}

export function assertRecipePayloadConsistency(
  ctx: z.RefinementCtx,
  recipe: RecipePayloadCollections,
): void {
  assertContiguousOneBasedPositions(ctx, recipe.ingredients, ['recipe', 'ingredients']);
  assertContiguousOneBasedPositions(ctx, recipe.steps, ['recipe', 'steps']);

  assertUniqueKeys(
    ctx,
    recipe.translations.map((item, index) => ({
      key: item.languageTag,
      path: ['recipe', 'translations', index, 'languageTag'],
    })),
    'Duplicate translation language tags are not allowed',
  );

  for (const [index, item] of recipe.translations.entries()) {
    if (item.languageTag === recipe.sourceLanguage) {
      addCustomIssue(ctx, 'Translation language must differ from the recipe source language', [
        'recipe',
        'translations',
        index,
        'languageTag',
      ]);
    }
  }

  const tagKeys: Array<{ key: string; path: Array<string | number> }> = [];
  for (const [index, tag] of recipe.tags.entries()) {
    if ('tagId' in tag) {
      tagKeys.push({ key: `id:${tag.tagId}`, path: ['recipe', 'tags', index, 'tagId'] });
    } else {
      tagKeys.push({
        key: `name:${tag.name.toLowerCase()}`,
        path: ['recipe', 'tags', index, 'name'],
      });
    }
  }
  assertUniqueKeys(ctx, tagKeys, 'Duplicate tags are not allowed');

  const ingredientPositions = new Set(recipe.ingredients.map((item) => item.position));
  const stepPositions = new Set(recipe.steps.map((item) => item.position));

  assertUniqueKeys(
    ctx,
    recipe.ingredientTranslations.map((item, index) => ({
      key: `${item.ingredientPosition}:${item.languageTag}`,
      path: ['recipe', 'ingredientTranslations', index],
    })),
    'Duplicate ingredient translations are not allowed',
  );

  for (const [index, item] of recipe.ingredientTranslations.entries()) {
    if (!ingredientPositions.has(item.ingredientPosition)) {
      addCustomIssue(ctx, 'Ingredient translation position does not match an ingredient', [
        'recipe',
        'ingredientTranslations',
        index,
        'ingredientPosition',
      ]);
    }
    if (item.languageTag === recipe.sourceLanguage) {
      addCustomIssue(ctx, 'Translation language must differ from the recipe source language', [
        'recipe',
        'ingredientTranslations',
        index,
        'languageTag',
      ]);
    }
  }

  assertUniqueKeys(
    ctx,
    recipe.stepTranslations.map((item, index) => ({
      key: `${item.stepPosition}:${item.languageTag}`,
      path: ['recipe', 'stepTranslations', index],
    })),
    'Duplicate step translations are not allowed',
  );

  for (const [index, item] of recipe.stepTranslations.entries()) {
    if (!stepPositions.has(item.stepPosition)) {
      addCustomIssue(ctx, 'Step translation position does not match a step', [
        'recipe',
        'stepTranslations',
        index,
        'stepPosition',
      ]);
    }
    if (item.languageTag === recipe.sourceLanguage) {
      addCustomIssue(ctx, 'Translation language must differ from the recipe source language', [
        'recipe',
        'stepTranslations',
        index,
        'languageTag',
      ]);
    }
  }
}
