import { z } from 'zod';

import { familyIdSchema } from './family.js';
import { FAMILY_TAG_NAME_MAX, FAMILY_TAG_NAME_MIN, MAX_TAGS_PER_RECIPE } from './recipe-limits.js';

export const recipeTagNameSchema = z
  .string()
  .trim()
  .min(FAMILY_TAG_NAME_MIN)
  .max(FAMILY_TAG_NAME_MAX);

export type RecipeTagName = z.infer<typeof recipeTagNameSchema>;

/** Attach an existing family tag by id (server verifies family scope in T2.2+). */
export const recipeTagByIdSchema = z.object({
  tagId: z.uuid(),
});

/** Attach by display name; family tag row resolved or created in later tasks. */
export const recipeTagByNameSchema = z.object({
  name: recipeTagNameSchema,
});

export const recipeTagAttachSchema = z.union([recipeTagByIdSchema, recipeTagByNameSchema]);

export type RecipeTagAttach = z.infer<typeof recipeTagAttachSchema>;

export const recipeTagsAttachInputSchema = z.array(recipeTagAttachSchema).max(MAX_TAGS_PER_RECIPE);

export const familyTagSummarySchema = z.object({
  id: z.uuid(),
  familyId: familyIdSchema,
  name: recipeTagNameSchema,
  normalizedName: z.string().min(1).max(FAMILY_TAG_NAME_MAX),
});

export type FamilyTagSummary = z.infer<typeof familyTagSummarySchema>;
