import type { CallToolResult } from '@modelcontextprotocol/server';

import type { McpActorContext } from './context.js';
import type { McpToolName } from './tool-executor.impl.js';
import { executeMcpToolImpl } from './tool-executor.impl.js';
import { toolError } from './tool-result.js';

export async function executeMcpTool(
  name: McpToolName,
  input: unknown,
  ctx: McpActorContext | undefined,
): Promise<CallToolResult> {
  if (!ctx?.userId || !ctx.supabase) {
    return toolError('AUTH_REQUIRED');
  }
  return executeMcpToolImpl(name, input, ctx as McpActorContext & { userId: string; supabase: NonNullable<McpActorContext['supabase']> });
}
