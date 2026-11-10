import * as z from 'zod';

/** MCP tool inputs use snake_case at the protocol boundary (mapped to contracts in T4.4). */

export const listMyFamiliesToolSchema = z.object({});

export const searchRecipesToolSchema = z.object({
  family_id: z.string().uuid(),
  query: z.string().trim().max(200).optional(),
  ingredient: z.string().trim().max(200).optional(),
  category: z.string().trim().max(120).optional(),
  tag: z.string().trim().max(120).optional(),
  language: z.string().trim().max(16).optional(),
  created_by: z.string().uuid().optional(),
  include_archived: z.boolean().optional(),
  limit: z.number().int().min(1).max(50).optional(),
  cursor: z.string().trim().max(512).optional(),
});

export const getRecipeToolSchema = z.object({
  family_id: z.string().uuid(),
  recipe_id: z.string().uuid(),
  language: z.string().trim().max(16).optional(),
});

export const getRecipeHistoryToolSchema = z.object({
  family_id: z.string().uuid(),
  recipe_id: z.string().uuid(),
  limit: z.number().int().min(1).max(50).optional(),
  cursor: z.string().trim().max(512).optional(),
});

export const createRecipeToolSchema = z.object({
  family_id: z.string().uuid(),
  recipe: z.record(z.string(), z.unknown()),
});

export const updateRecipeToolSchema = z.object({
  family_id: z.string().uuid(),
  recipe_id: z.string().uuid(),
  expected_version: z.number().int().min(1),
  patch: z.record(z.string(), z.unknown()),
});

export const archiveRecipeToolSchema = z.object({
  family_id: z.string().uuid(),
  recipe_id: z.string().uuid(),
  expected_version: z.number().int().min(1),
  confirm: z.literal(true),
});

export const restoreRecipeToolSchema = z.object({
  family_id: z.string().uuid(),
  recipe_id: z.string().uuid(),
  expected_version: z.number().int().min(1),
});
