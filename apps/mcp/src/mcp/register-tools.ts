import type { McpServer } from '@modelcontextprotocol/server';
import type { z } from 'zod';

import { getMcpContext } from './context.js';
import { logMcpEvent } from './log.js';
import {
  archiveRecipeToolSchema,
  createRecipeToolSchema,
  getRecipeHistoryToolSchema,
  getRecipeToolSchema,
  listMyFamiliesToolSchema,
  restoreRecipeToolSchema,
  searchRecipesToolSchema,
  updateRecipeToolSchema,
} from './tool-schemas.js';
import { toolError, toolSuccessJson } from './tool-result.js';
import { executeMcpTool } from './tool-executor.js';

export const MCP_TOOL_NAMES = [
  'list_my_families',
  'search_recipes',
  'get_recipe',
  'get_recipe_history',
  'create_recipe',
  'update_recipe',
  'archive_recipe',
  'restore_recipe',
] as const;

type ToolRegistration = {
  name: (typeof MCP_TOOL_NAMES)[number];
  description: string;
  inputSchema: z.ZodObject<z.ZodRawShape>;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
};

const TOOL_DEFINITIONS: ToolRegistration[] = [
  {
    name: 'list_my_families',
    description: 'List active family memberships and roles for the authenticated user.',
    inputSchema: listMyFamiliesToolSchema,
    readOnlyHint: true,
  },
  {
    name: 'search_recipes',
    description: 'Search recipes in a family. Requires family_id.',
    inputSchema: searchRecipesToolSchema,
    readOnlyHint: true,
  },
  {
    name: 'get_recipe',
    description: 'Get a recipe with ingredients, steps, and tags. Requires family_id and recipe_id.',
    inputSchema: getRecipeToolSchema,
    readOnlyHint: true,
  },
  {
    name: 'get_recipe_history',
    description: 'List revision history for a recipe (role-restricted).',
    inputSchema: getRecipeHistoryToolSchema,
    readOnlyHint: true,
  },
  {
    name: 'create_recipe',
    description: 'Create a new recipe in a family (role-restricted).',
    inputSchema: createRecipeToolSchema,
  },
  {
    name: 'update_recipe',
    description: 'Update a recipe; requires expected_version for optimistic concurrency.',
    inputSchema: updateRecipeToolSchema,
  },
  {
    name: 'archive_recipe',
    description: 'Archive a recipe; requires confirm: true and expected_version.',
    inputSchema: archiveRecipeToolSchema,
    destructiveHint: true,
  },
  {
    name: 'restore_recipe',
    description: 'Restore an archived recipe; requires expected_version.',
    inputSchema: restoreRecipeToolSchema,
  },
];

export function registerFamilyCookbookTools(server: McpServer): void {
  for (const tool of TOOL_DEFINITIONS) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: {
          ...(tool.readOnlyHint ? { readOnlyHint: true } : {}),
          ...(tool.destructiveHint ? { destructiveHint: true } : {}),
        },
      },
      async (input: Record<string, unknown>) => {
        const ctx = getMcpContext();
        const requestId = ctx?.requestId ?? 'unknown';
        try {
          const result = await executeMcpTool(tool.name, input, ctx);
          const logFields: Parameters<typeof logMcpEvent>[2] = {
            requestId,
            tool: tool.name,
            outcome: result.isError ? 'error' : 'ok',
          };
          if (ctx?.userId) {
            logFields.userId = ctx.userId;
          }
          if (ctx?.oauthClientId) {
            logFields.oauthClientId = ctx.oauthClientId;
          }
          logMcpEvent('info', 'tool_call', logFields);
          return result;
        } catch (error) {
          if (error instanceof Error && error.message === 'MCP_AUTH_REQUIRED') {
            logMcpEvent('warn', 'tool_call_denied', { requestId, tool: tool.name, outcome: 'auth_required' });
            return toolError('AUTH_REQUIRED');
          }
          logMcpEvent('warn', 'tool_call_failed', { requestId, tool: tool.name, outcome: 'internal' });
          return toolError('QUERY_FAILED');
        }
      },
    );
  }
}

/** Exposed for tests that expect stub auth gate before T4.3 wiring. */
export function authRequiredToolResult() {
  return toolError('AUTH_REQUIRED');
}

export function registerCount(): number {
  return TOOL_DEFINITIONS.length;
}
