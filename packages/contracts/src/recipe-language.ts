import { z } from 'zod';

import { RECIPE_LANGUAGE_TAG_MAX_LENGTH } from './recipe-limits.js';

/**
 * Conservative BCP 47 tag validation for recipe source/translation language metadata.
 * Distinct from UI profile/family locale enums (`profilePreferredLanguageSchema`).
 */
const RECIPE_LANGUAGE_TAG_PATTERN = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/;

export const recipeLanguageTagSchema = z
  .string()
  .trim()
  .min(2)
  .max(RECIPE_LANGUAGE_TAG_MAX_LENGTH)
  .regex(RECIPE_LANGUAGE_TAG_PATTERN, {
    message: 'Invalid BCP 47 language tag',
  });

export type RecipeLanguageTag = z.infer<typeof recipeLanguageTagSchema>;
