import { z } from 'zod';

import { familyIdSchema } from './family.js';
import { recipeIdSchema } from './recipe-core.js';
import { RECIPE_HISTORY_LIMIT_MAX, RECIPE_HISTORY_LIMIT_MIN } from './recipe-limits.js';
import { recipeLanguageTagSchema } from './recipe-language.js';

export const getRecipeInputSchema = z.object({
  familyId: familyIdSchema,
  recipeId: recipeIdSchema,
  language: recipeLanguageTagSchema.optional(),
});

export type GetRecipeInput = z.infer<typeof getRecipeInputSchema>;

export const archiveRecipeInputSchema = z.object({
  familyId: familyIdSchema,
  recipeId: recipeIdSchema,
  expectedVersion: z.number().int().min(1),
  confirm: z.literal(true),
});

export type ArchiveRecipeInput = z.infer<typeof archiveRecipeInputSchema>;

export const restoreRecipeInputSchema = z.object({
  familyId: familyIdSchema,
  recipeId: recipeIdSchema,
  expectedVersion: z.number().int().min(1),
});

export type RestoreRecipeInput = z.infer<typeof restoreRecipeInputSchema>;

export const getRecipeHistoryInputSchema = z.object({
  familyId: familyIdSchema,
  recipeId: recipeIdSchema,
  limit: z.number().int().min(RECIPE_HISTORY_LIMIT_MIN).max(RECIPE_HISTORY_LIMIT_MAX).optional(),
  cursor: z.string().trim().min(1).max(512).optional(),
});

export type GetRecipeHistoryInput = z.infer<typeof getRecipeHistoryInputSchema>;
