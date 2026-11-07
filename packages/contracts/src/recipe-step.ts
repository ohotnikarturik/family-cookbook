import { z } from 'zod';

import {
  MAX_RECIPE_STEPS,
  RECIPE_MINUTES_MAX,
  RECIPE_STEP_INSTRUCTION_MAX,
  RECIPE_STEP_INSTRUCTION_MIN,
} from './recipe-limits.js';

export const recipeStepInputSchema = z.object({
  position: z.number().int().positive(),
  instruction: z.string().trim().min(RECIPE_STEP_INSTRUCTION_MIN).max(RECIPE_STEP_INSTRUCTION_MAX),
  durationMinutes: z.number().int().min(0).max(RECIPE_MINUTES_MAX).nullable().optional(),
});

export type RecipeStepInput = z.infer<typeof recipeStepInputSchema>;

export const recipeStepsInputSchema = z.array(recipeStepInputSchema).max(MAX_RECIPE_STEPS);
