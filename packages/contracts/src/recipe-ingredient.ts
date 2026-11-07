import { z } from 'zod';

import {
  MAX_RECIPE_INGREDIENTS,
  RECIPE_INGREDIENT_NAME_MAX,
  RECIPE_INGREDIENT_NAME_MIN,
  RECIPE_INGREDIENT_NOTES_MAX,
  RECIPE_INGREDIENT_QUANTITY_MAX,
  RECIPE_INGREDIENT_QUANTITY_MAX_FRACTION_DIGITS,
  RECIPE_INGREDIENT_QUANTITY_TEXT_MAX,
  RECIPE_INGREDIENT_UNIT_MAX,
  hasAtMostFractionDigits,
} from './recipe-limits.js';

export const recipeIngredientInputSchema = z.object({
  position: z.number().int().positive(),
  name: z.string().trim().min(RECIPE_INGREDIENT_NAME_MIN).max(RECIPE_INGREDIENT_NAME_MAX),
  quantity: z
    .number()
    .finite()
    .positive()
    .max(RECIPE_INGREDIENT_QUANTITY_MAX)
    .refine(
      (value) => hasAtMostFractionDigits(value, RECIPE_INGREDIENT_QUANTITY_MAX_FRACTION_DIGITS),
      { message: 'Quantity must have at most four decimal places' },
    )
    .nullable()
    .optional(),
  quantityText: z
    .string()
    .trim()
    .min(1)
    .max(RECIPE_INGREDIENT_QUANTITY_TEXT_MAX)
    .nullable()
    .optional(),
  unit: z.string().trim().min(1).max(RECIPE_INGREDIENT_UNIT_MAX).nullable().optional(),
  notes: z.string().trim().min(1).max(RECIPE_INGREDIENT_NOTES_MAX).nullable().optional(),
});

export type RecipeIngredientInput = z.infer<typeof recipeIngredientInputSchema>;

export const recipeIngredientsInputSchema = z
  .array(recipeIngredientInputSchema)
  .max(MAX_RECIPE_INGREDIENTS);
