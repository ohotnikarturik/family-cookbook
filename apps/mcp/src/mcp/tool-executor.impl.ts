import type { CallToolResult } from '@modelcontextprotocol/server';
import type { AppSupabaseClient } from '@family-cookbook/data-access';

import type { McpActorContext } from './context.js';
import { MCP_TOOL_NAMES } from './register-tools.js';
import { mapFamilyTool, mapRecipeTool } from './tools/index.js';
import { toolError } from './tool-result.js';

export type McpToolName = (typeof MCP_TOOL_NAMES)[number];

export async function executeMcpToolImpl(
  name: McpToolName,
  input: unknown,
  ctx: McpActorContext & { userId: string; supabase: AppSupabaseClient },
): Promise<CallToolResult> {
  switch (name) {
    case 'list_my_families':
      return mapFamilyTool.listMyFamilies(ctx);
    case 'search_recipes':
      return mapRecipeTool.searchRecipes(ctx, input);
    case 'get_recipe':
      return mapRecipeTool.getRecipe(ctx, input);
    case 'get_recipe_history':
      return mapRecipeTool.getRecipeHistory(ctx, input);
    case 'create_recipe':
      return mapRecipeTool.createRecipe(ctx, input);
    case 'update_recipe':
      return mapRecipeTool.updateRecipe(ctx, input);
    case 'archive_recipe':
      return mapRecipeTool.archiveRecipe(ctx, input);
    case 'restore_recipe':
      return mapRecipeTool.restoreRecipe(ctx, input);
    default: {
      const _exhaustive: never = name;
      return toolError('VALIDATION_ERROR', `Unknown tool: ${_exhaustive}`);
    }
  }
}
