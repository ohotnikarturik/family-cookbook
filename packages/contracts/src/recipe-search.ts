import { z } from 'zod';

import { familyIdSchema } from './family.js';
import { recipeLanguageTagSchema } from './recipe-language.js';
import {
  SEARCH_CATEGORY_MAX,
  SEARCH_INGREDIENT_MAX,
  SEARCH_QUERY_MAX,
  SEARCH_RECIPES_LIMIT_MAX,
  SEARCH_RECIPES_LIMIT_MIN,
  SEARCH_TAG_MAX,
} from './recipe-limits.js';

export const recipeSearchSortSchema = z.enum(['updatedAt', 'createdAt', 'title']);

export type RecipeSearchSort = z.infer<typeof recipeSearchSortSchema>;

export const searchRecipesInputSchema = z.object({
  familyId: familyIdSchema,
  query: z.string().trim().min(1).max(SEARCH_QUERY_MAX).optional(),
  ingredient: z.string().trim().min(1).max(SEARCH_INGREDIENT_MAX).optional(),
  category: z.string().trim().min(1).max(SEARCH_CATEGORY_MAX).optional(),
  tag: z.string().trim().min(1).max(SEARCH_TAG_MAX).optional(),
  language: recipeLanguageTagSchema.optional(),
  createdBy: z.uuid().optional(),
  includeArchived: z.boolean().optional(),
  sort: recipeSearchSortSchema.optional(),
  limit: z.number().int().min(SEARCH_RECIPES_LIMIT_MIN).max(SEARCH_RECIPES_LIMIT_MAX).optional(),
  cursor: z.string().trim().min(1).max(512).optional(),
});

export type SearchRecipesInput = z.infer<typeof searchRecipesInputSchema>;
