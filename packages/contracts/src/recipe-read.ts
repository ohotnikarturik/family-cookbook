import { z } from 'zod';

import { familyIdSchema } from './family.js';
import { recipeIdSchema, recipeStatusSchema } from './recipe-core.js';
import { recipeIngredientInputSchema } from './recipe-ingredient.js';
import { recipeStepInputSchema } from './recipe-step.js';
import { familyTagSummarySchema } from './recipe-tag.js';
import { recipeTranslationInputSchema } from './recipe-translation.js';
import { SEARCH_RECIPES_LIMIT_MAX } from './recipe-limits.js';
import { recipeAssetSummarySchema } from './recipe-asset.js';

export const recipeMutationResultSchema = z.object({
  recipe_id: z.uuid(),
  version: z.number().int().min(1),
});

export type RecipeMutationResultRow = z.infer<typeof recipeMutationResultSchema>;

export const recipeSummarySchema = z.object({
  id: recipeIdSchema,
  familyId: familyIdSchema,
  title: z.string(),
  sourceLanguage: z.string(),
  category: z.string().nullable(),
  status: recipeStatusSchema,
  version: z.number().int().min(1),
  createdBy: z.uuid(),
  updatedAt: z.string(),
  createdAt: z.string(),
});

export type RecipeSummary = z.infer<typeof recipeSummarySchema>;

export const recipeDetailSchema = recipeSummarySchema.extend({
  description: z.string().nullable(),
  servings: z.number().nullable(),
  prepMinutes: z.number().int().nullable(),
  cookMinutes: z.number().int().nullable(),
  notes: z.string().nullable(),
  archivedAt: z.string().nullable(),
  updatedBy: z.uuid(),
  ingredients: z.array(recipeIngredientInputSchema),
  steps: z.array(recipeStepInputSchema),
  tags: z.array(familyTagSummarySchema),
  translations: z.array(
    recipeTranslationInputSchema.extend({
      reviewStatus: z.enum(['unreviewed', 'reviewed']).optional(),
    }),
  ),
  assets: z.array(recipeAssetSummarySchema),
});

export type RecipeDetail = z.infer<typeof recipeDetailSchema>;

export const recipeRevisionSummarySchema = z.object({
  id: z.uuid(),
  recipeId: recipeIdSchema,
  familyId: familyIdSchema,
  version: z.number().int().min(1),
  changedBy: z.uuid(),
  changeSummary: z.string().nullable(),
  createdAt: z.string(),
});

export type RecipeRevisionSummary = z.infer<typeof recipeRevisionSummarySchema>;

export const recipeSearchResultSchema = z.object({
  items: z.array(recipeSummarySchema),
  nextCursor: z.string().nullable(),
});

export type RecipeSearchResult = z.infer<typeof recipeSearchResultSchema>;

export const recipeHistoryResultSchema = z.object({
  items: z.array(recipeRevisionSummarySchema),
  nextCursor: z.string().nullable(),
});

export type RecipeHistoryResult = z.infer<typeof recipeHistoryResultSchema>;

export const RECIPE_SEARCH_DEFAULT_LIMIT = 25;
export const RECIPE_SEARCH_MAX_LIMIT = SEARCH_RECIPES_LIMIT_MAX;
