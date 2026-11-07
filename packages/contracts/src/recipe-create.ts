import { z } from 'zod';

import { familyIdSchema } from './family.js';
import { assertRecipePayloadConsistency } from './recipe-consistency.js';
import { recipeCoreFieldsSchema } from './recipe-core.js';
import { recipeIngredientsInputSchema } from './recipe-ingredient.js';
import { recipeStepsInputSchema } from './recipe-step.js';
import { recipeTagsAttachInputSchema } from './recipe-tag.js';
import {
  recipeIngredientTranslationsInputSchema,
  recipeStepTranslationsInputSchema,
  recipeTranslationsInputSchema,
} from './recipe-translation.js';

export const createRecipePayloadSchema = recipeCoreFieldsSchema.extend({
  ingredients: recipeIngredientsInputSchema.default([]),
  steps: recipeStepsInputSchema.default([]),
  tags: recipeTagsAttachInputSchema.default([]),
  translations: recipeTranslationsInputSchema.default([]),
  ingredientTranslations: recipeIngredientTranslationsInputSchema.default([]),
  stepTranslations: recipeStepTranslationsInputSchema.default([]),
});

export type CreateRecipePayload = z.infer<typeof createRecipePayloadSchema>;

export const createRecipeInputSchema = z
  .object({
    familyId: familyIdSchema,
    recipe: createRecipePayloadSchema,
  })
  .superRefine((value, ctx) => {
    assertRecipePayloadConsistency(ctx, value.recipe);
  });

export type CreateRecipeInput = z.infer<typeof createRecipeInputSchema>;
