import { z } from 'zod';

import {
  MAX_RECIPE_INGREDIENT_TRANSLATIONS,
  MAX_RECIPE_STEP_TRANSLATIONS,
  MAX_RECIPE_TRANSLATIONS,
  RECIPE_TRANSLATION_DESCRIPTION_MAX,
  RECIPE_TRANSLATION_INGREDIENT_NAME_MAX,
  RECIPE_TRANSLATION_INGREDIENT_NAME_MIN,
  RECIPE_TRANSLATION_INGREDIENT_NOTES_MAX,
  RECIPE_TRANSLATION_NOTES_MAX,
  RECIPE_TRANSLATION_STEP_INSTRUCTION_MAX,
  RECIPE_TRANSLATION_STEP_INSTRUCTION_MIN,
  RECIPE_TRANSLATION_TITLE_MAX,
  RECIPE_TRANSLATION_TITLE_MIN,
} from './recipe-limits.js';
import { recipeLanguageTagSchema } from './recipe-language.js';

export const translationReviewStatusSchema = z.enum(['unreviewed', 'reviewed']);

export type TranslationReviewStatus = z.infer<typeof translationReviewStatusSchema>;

export const recipeTranslationInputSchema = z.object({
  languageTag: recipeLanguageTagSchema,
  title: z.string().trim().min(RECIPE_TRANSLATION_TITLE_MIN).max(RECIPE_TRANSLATION_TITLE_MAX),
  description: z
    .string()
    .trim()
    .min(1)
    .max(RECIPE_TRANSLATION_DESCRIPTION_MAX)
    .nullable()
    .optional(),
  notes: z.string().trim().min(1).max(RECIPE_TRANSLATION_NOTES_MAX).nullable().optional(),
});

export type RecipeTranslationInput = z.infer<typeof recipeTranslationInputSchema>;

export const recipeTranslationsInputSchema = z
  .array(recipeTranslationInputSchema)
  .max(MAX_RECIPE_TRANSLATIONS);

export const recipeIngredientTranslationInputSchema = z.object({
  ingredientPosition: z.number().int().positive(),
  languageTag: recipeLanguageTagSchema,
  name: z
    .string()
    .trim()
    .min(RECIPE_TRANSLATION_INGREDIENT_NAME_MIN)
    .max(RECIPE_TRANSLATION_INGREDIENT_NAME_MAX),
  notes: z
    .string()
    .trim()
    .min(1)
    .max(RECIPE_TRANSLATION_INGREDIENT_NOTES_MAX)
    .nullable()
    .optional(),
});

export type RecipeIngredientTranslationInput = z.infer<
  typeof recipeIngredientTranslationInputSchema
>;

export const recipeIngredientTranslationsInputSchema = z
  .array(recipeIngredientTranslationInputSchema)
  .max(MAX_RECIPE_INGREDIENT_TRANSLATIONS);

export const recipeStepTranslationInputSchema = z.object({
  stepPosition: z.number().int().positive(),
  languageTag: recipeLanguageTagSchema,
  instruction: z
    .string()
    .trim()
    .min(RECIPE_TRANSLATION_STEP_INSTRUCTION_MIN)
    .max(RECIPE_TRANSLATION_STEP_INSTRUCTION_MAX),
});

export type RecipeStepTranslationInput = z.infer<typeof recipeStepTranslationInputSchema>;

export const recipeStepTranslationsInputSchema = z
  .array(recipeStepTranslationInputSchema)
  .max(MAX_RECIPE_STEP_TRANSLATIONS);
