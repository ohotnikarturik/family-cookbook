import { z } from 'zod';

import { familyIdSchema } from './family.js';
import { recipeIdSchema } from './recipe-core.js';
import { RECIPE_CHANGE_SUMMARY_MAX } from './recipe-limits.js';
import { recipeLanguageTagSchema } from './recipe-language.js';
import {
  recipeIngredientTranslationsInputSchema,
  recipeStepTranslationsInputSchema,
  recipeTranslationInputSchema,
  translationReviewStatusSchema,
} from './recipe-translation.js';

export const upsertRecipeTranslationPayloadSchema = recipeTranslationInputSchema
  .omit({ languageTag: true })
  .extend({
    ingredients: recipeIngredientTranslationsInputSchema,
    steps: recipeStepTranslationsInputSchema,
    reviewStatus: translationReviewStatusSchema.optional(),
    changeSummary: z.string().trim().min(1).max(RECIPE_CHANGE_SUMMARY_MAX).nullable().optional(),
  });

export type UpsertRecipeTranslationPayload = z.infer<typeof upsertRecipeTranslationPayloadSchema>;

export const upsertRecipeTranslationInputSchema = z
  .object({
    familyId: familyIdSchema,
    recipeId: recipeIdSchema,
    expectedVersion: z.number().int().min(1),
    languageTag: recipeLanguageTagSchema,
    translation: upsertRecipeTranslationPayloadSchema,
  })
  .superRefine((value, ctx) => {
    const languageTag = value.languageTag;
    for (const [index, item] of value.translation.ingredients.entries()) {
      if (item.languageTag !== languageTag) {
        ctx.addIssue({
          code: 'custom',
          message: 'ingredient translation languageTag must match request languageTag',
          path: ['translation', 'ingredients', index, 'languageTag'],
        });
      }
    }
    for (const [index, item] of value.translation.steps.entries()) {
      if (item.languageTag !== languageTag) {
        ctx.addIssue({
          code: 'custom',
          message: 'step translation languageTag must match request languageTag',
          path: ['translation', 'steps', index, 'languageTag'],
        });
      }
    }
  });

export type UpsertRecipeTranslationInput = z.infer<typeof upsertRecipeTranslationInputSchema>;
