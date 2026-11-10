import {
  archiveRecipe,
  createRecipe,
  getRecipe,
  getRecipeHistory,
  restoreRecipe,
  searchRecipes,
  updateRecipe,
} from '@family-cookbook/application';
import type { AppSupabaseClient } from '@family-cookbook/data-access';
import type { CallToolResult } from '@modelcontextprotocol/server';

import type { McpActorContext } from '../context.js';
import {
  parseArchiveRecipeMcpInput,
  parseCreateRecipeMcpInput,
  parseGetRecipeHistoryMcpInput,
  parseGetRecipeMcpInput,
  parseRestoreRecipeMcpInput,
  parseSearchRecipesMcpInput,
  parseUpdateRecipeMcpInput,
} from './mcp-input.js';
import { useCaseToToolResult } from './map-use-case.js';
import { toolError } from '../tool-result.js';

type AuthedCtx = McpActorContext & { supabase: AppSupabaseClient };

function validationFailed(): CallToolResult {
  return toolError('VALIDATION_ERROR');
}

export const mapRecipeTool = {
  async searchRecipes(ctx: AuthedCtx, raw: unknown): Promise<CallToolResult> {
    const parsed = parseSearchRecipesMcpInput(raw);
    if (!parsed.success) {
      return validationFailed();
    }
    const result = await searchRecipes(ctx.supabase, parsed.data);
    return useCaseToToolResult(result, {
      ok: (value) => value.result,
    });
  },

  async getRecipe(ctx: AuthedCtx, raw: unknown): Promise<CallToolResult> {
    const parsed = parseGetRecipeMcpInput(raw);
    if (!parsed.success) {
      return validationFailed();
    }
    const result = await getRecipe(ctx.supabase, parsed.data);
    return useCaseToToolResult(result, {
      ok: (value) => value.recipe,
    });
  },

  async getRecipeHistory(ctx: AuthedCtx, raw: unknown): Promise<CallToolResult> {
    const parsed = parseGetRecipeHistoryMcpInput(raw);
    if (!parsed.success) {
      return validationFailed();
    }
    const result = await getRecipeHistory(ctx.supabase, parsed.data);
    return useCaseToToolResult(result, {
      ok: (value) => value.result,
    });
  },

  async createRecipe(ctx: AuthedCtx, raw: unknown): Promise<CallToolResult> {
    const parsed = parseCreateRecipeMcpInput(raw);
    if (!parsed.success) {
      return validationFailed();
    }
    const result = await createRecipe(ctx.supabase, parsed.data);
    return useCaseToToolResult(result, {
      ok: (value) => ({ recipe_id: value.recipeId, version: value.version }),
    });
  },

  async updateRecipe(ctx: AuthedCtx, raw: unknown): Promise<CallToolResult> {
    const parsed = parseUpdateRecipeMcpInput(raw);
    if (!parsed.success) {
      return validationFailed();
    }
    const result = await updateRecipe(ctx.supabase, parsed.data);
    return useCaseToToolResult(result, {
      ok: (value) => ({ recipe_id: value.recipeId, version: value.version }),
    });
  },

  async archiveRecipe(ctx: AuthedCtx, raw: unknown): Promise<CallToolResult> {
    const parsed = parseArchiveRecipeMcpInput(raw);
    if (!parsed.success) {
      if (typeof raw === 'object' && raw !== null && (raw as Record<string, unknown>)['confirm'] !== true) {
        return toolError('CONFIRMATION_REQUIRED');
      }
      return validationFailed();
    }
    const result = await archiveRecipe(ctx.supabase, parsed.data);
    return useCaseToToolResult(result, {
      ok: (value) => ({ recipe_id: value.recipeId, version: value.version }),
    });
  },

  async restoreRecipe(ctx: AuthedCtx, raw: unknown): Promise<CallToolResult> {
    const parsed = parseRestoreRecipeMcpInput(raw);
    if (!parsed.success) {
      return validationFailed();
    }
    const result = await restoreRecipe(ctx.supabase, parsed.data);
    return useCaseToToolResult(result, {
      ok: (value) => ({ recipe_id: value.recipeId, version: value.version }),
    });
  },
};
