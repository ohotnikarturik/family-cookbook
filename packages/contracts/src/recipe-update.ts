import { z } from 'zod';

import { familyIdSchema } from './family.js';
import { assertRecipePayloadConsistency } from './recipe-consistency.js';
import { recipeCoreFieldsSchema, recipeIdSchema } from './recipe-core.js';
import { recipeIngredientsInputSchema } from './recipe-ingredient.js';
import { RECIPE_CHANGE_SUMMARY_MAX } from './recipe-limits.js';
import { recipeStepsInputSchema } from './recipe-step.js';
import { recipeTagsAttachInputSchema } from './recipe-tag.js';
import {
  recipeIngredientTranslationsInputSchema,
  recipeStepTranslationsInputSchema,
  recipeTranslationsInputSchema,
} from './recipe-translation.js';

/**
 * Full aggregate replace. Collection arrays are required and have no empty
 * defaults, so omitting them cannot wipe ingredients, steps, tags, or translations.
 */
export const updateRecipePayloadSchema = recipeCoreFieldsSchema.extend({
  ingredients: recipeIngredientsInputSchema,
  steps: recipeStepsInputSchema,
  tags: recipeTagsAttachInputSchema,
  translations: recipeTranslationsInputSchema,
  ingredientTranslations: recipeIngredientTranslationsInputSchema,
  stepTranslations: recipeStepTranslationsInputSchema,
  changeSummary: z.string().trim().min(1).max(RECIPE_CHANGE_SUMMARY_MAX).nullable().optional(),
});

export type UpdateRecipePayload = z.infer<typeof updateRecipePayloadSchema>;

export const updateRecipeInputSchema = z
  .object({
    familyId: familyIdSchema,
    recipeId: recipeIdSchema,
    expectedVersion: z.number().int().min(1),
    recipe: updateRecipePayloadSchema,
  })
  .superRefine((value, ctx) => {
    assertRecipePayloadConsistency(ctx, value.recipe);
  });

export type UpdateRecipeInput = z.infer<typeof updateRecipeInputSchema>;
