import { z } from 'zod';

import {
  RECIPE_CATEGORY_MAX,
  RECIPE_DESCRIPTION_MAX,
  RECIPE_MINUTES_MAX,
  RECIPE_NOTES_MAX,
  RECIPE_SERVINGS_MAX,
  RECIPE_SERVINGS_MAX_FRACTION_DIGITS,
  RECIPE_TITLE_MAX,
  RECIPE_TITLE_MIN,
  hasAtMostFractionDigits,
} from './recipe-limits.js';
import { recipeLanguageTagSchema } from './recipe-language.js';

export const recipeStatusSchema = z.enum(['active', 'archived']);

export type RecipeStatus = z.infer<typeof recipeStatusSchema>;

const servingsNumberSchema = z
  .number()
  .finite()
  .positive()
  .max(RECIPE_SERVINGS_MAX)
  .refine((value) => hasAtMostFractionDigits(value, RECIPE_SERVINGS_MAX_FRACTION_DIGITS), {
    message: 'Servings must have at most two decimal places',
  });

const durationMinutesSchema = z.number().int().min(0).max(RECIPE_MINUTES_MAX);

export const recipeCoreFieldsSchema = z.object({
  title: z.string().trim().min(RECIPE_TITLE_MIN).max(RECIPE_TITLE_MAX),
  sourceLanguage: recipeLanguageTagSchema,
  description: z.string().trim().min(1).max(RECIPE_DESCRIPTION_MAX).nullable().optional(),
  category: z.string().trim().min(1).max(RECIPE_CATEGORY_MAX).nullable().optional(),
  servings: servingsNumberSchema.nullable().optional(),
  prepMinutes: durationMinutesSchema.nullable().optional(),
  cookMinutes: durationMinutesSchema.nullable().optional(),
  notes: z.string().trim().min(1).max(RECIPE_NOTES_MAX).nullable().optional(),
});

export type RecipeCoreFields = z.infer<typeof recipeCoreFieldsSchema>;

export const recipeIdSchema = z.uuid();
