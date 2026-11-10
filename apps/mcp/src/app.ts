import { bootstrapHealthSchema } from '@family-cookbook/contracts';
import { createMcpHonoApp } from '@modelcontextprotocol/hono';
import { randomUUID } from 'node:crypto';

import { resolveBearerActorContext } from './auth/bearer-context.js';
import { createMcpProtectedFetch } from './auth/mcp-pipeline.js';
import { getMcpHonoAppOptions, getMcpPublicUrl } from './config/env.js';
import { getMcpContext, runWithMcpContext, type McpActorContext } from './mcp/context.js';
import { getMcpHttpHandler } from './mcp/handler.js';

export type CreateMcpAppOptions = {
  /** When false, skips OAuth user gate (local protocol tests only). */
  enableOAuth?: boolean;
};

export function createMcpApp(options?: CreateMcpAppOptions) {
  const enableOAuth = options?.enableOAuth ?? process.env['MCP_DISABLE_OAUTH'] !== 'true';
  const app = createMcpHonoApp(getMcpHonoAppOptions());

  app.get('/health', (c) => {
    const body = bootstrapHealthSchema.parse({ status: 'ok' });
    return c.json(body);
  });

  const mcpHandler = getMcpHttpHandler();
  const protectedFetch = enableOAuth ? createMcpProtectedFetch() : null;

  const handleMcpRequest = async (c: { req: { raw: Request }; get: (key: 'parsedBody') => unknown }) => {
    const bearer = await resolveBearerActorContext(c.req.raw);
    const parent = getMcpContext();
    const userId = parent?.userId ?? bearer?.userId;
    const supabase = parent?.supabase ?? bearer?.supabase;
    const actorContext: McpActorContext = {
      requestId: parent?.requestId ?? randomUUID(),
      client: 'mcp',
      ...(userId ? { userId } : {}),
      ...(supabase ? { supabase } : {}),
      ...(parent?.oauthClientId ? { oauthClientId: parent.oauthClientId } : {}),
      ...(parent?.authInfo ? { authInfo: parent.authInfo } : {}),
    };

    return runWithMcpContext(actorContext, () =>
      mcpHandler.fetch(c.req.raw, {
        parsedBody: c.get('parsedBody'),
        ...(parent?.authInfo ? { authInfo: parent.authInfo } : {}),
      }),
    );
  };

  const dispatchMcp = (c: { req: { raw: Request }; get: (key: 'parsedBody') => unknown }) => {
    if (protectedFetch) {
      return protectedFetch(c.req.raw);
    }
    return handleMcpRequest(c);
  };

  app.all('/mcp', dispatchMcp);
  app.all('/mcp/', dispatchMcp);
  app.all('/mcp/*', dispatchMcp);

  app.get('/.well-known/family-cookbook-mcp', (c) =>
    c.json({
      mcp_endpoint: `${getMcpPublicUrl()}/mcp`,
      health: `${getMcpPublicUrl()}/health`,
      oauth_protected_resource: enableOAuth ? `${getMcpPublicUrl()}/mcp/oauth-protected-resource` : null,
    }),
  );

  return app;
}
