import { resolveSupabasePublicConfig } from '../config/resolve-supabase-config.js';
import type { AppSupabaseClient } from '@family-cookbook/data-access';
import { pipeline } from '@supabase/middleware';
import { fromSupabaseUrl, withOAuthProtectedResource, withSupabase } from '@supabase/server';
import { randomUUID } from 'node:crypto';

import { getMcpPublicUrl } from '../config/env.js';
import { runWithMcpContext, type McpActorContext } from '../mcp/context.js';
import { getMcpHttpHandler } from '../mcp/handler.js';

function resolveAuthorizationServer(): string {
  const issuer = process.env['OAUTH_ISSUER']?.trim();
  if (issuer) {
    return issuer.replace(/\/$/, '');
  }
  const config = resolveSupabasePublicConfig();
  if (!config) {
    throw new Error('Missing Supabase URL for OAuth authorization server');
  }
  return fromSupabaseUrl(config.url);
}

function resolveResourceServer(): string {
  return `${getMcpPublicUrl()}/mcp`;
}

export function createMcpProtectedFetch(): (request: Request) => Promise<Response> {
  return pipeline(
    [
      withOAuthProtectedResource({
        resourceServer: resolveResourceServer,
        authorizationServer: resolveAuthorizationServer(),
      }),
      withSupabase({ auth: 'user' }),
    ],
    async (req, ctx) => {
      const userId = ctx.userClaims?.id ?? ctx.jwtClaims?.sub;
      if (!userId) {
        return new Response(JSON.stringify({ error: 'auth_required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const clientIdRaw = ctx.jwtClaims?.['client_id'];
      const oauthClientId = typeof clientIdRaw === 'string' ? clientIdRaw : undefined;

      const actorContext: McpActorContext = {
        requestId: randomUUID(),
        client: 'mcp',
        userId,
        supabase: ctx.supabase as unknown as AppSupabaseClient,
        ...(oauthClientId ? { oauthClientId } : {}),
      };

      return runWithMcpContext(actorContext, () => getMcpHttpHandler().fetch(req));
    },
  );
}
