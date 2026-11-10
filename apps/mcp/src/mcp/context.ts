import { AsyncLocalStorage } from 'node:async_hooks';

import type { AppSupabaseClient } from '@family-cookbook/data-access';

export type McpActorContext = {
  requestId: string;
  client: 'mcp';
  userId?: string;
  oauthClientId?: string;
  supabase?: AppSupabaseClient;
  authInfo?: import('@modelcontextprotocol/server').AuthInfo;
};

const storage = new AsyncLocalStorage<McpActorContext>();

export function runWithMcpContext<T>(context: McpActorContext, fn: () => T): T {
  return storage.run(context, fn);
}

export function getMcpContext(): McpActorContext | undefined {
  return storage.getStore();
}

export function requireMcpAuth(): McpActorContext & { userId: string; supabase: AppSupabaseClient } {
  const ctx = storage.getStore();
  if (!ctx?.userId || !ctx.supabase) {
    throw new Error('MCP_AUTH_REQUIRED');
  }
  return ctx as McpActorContext & { userId: string; supabase: AppSupabaseClient };
}
