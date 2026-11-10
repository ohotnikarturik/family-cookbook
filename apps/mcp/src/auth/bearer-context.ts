import { getSessionUser, type AppSupabaseClient } from '@family-cookbook/data-access';
import { createClient } from '@supabase/supabase-js';

import { resolveSupabasePublicConfig } from '../config/resolve-supabase-config.js';
import type { McpActorContext } from '../mcp/context.js';

export async function resolveBearerActorContext(
  request: Request,
): Promise<Pick<McpActorContext, 'userId' | 'supabase'> | null> {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  const accessToken = header.slice('Bearer '.length).trim();
  if (!accessToken) {
    return null;
  }

  const config = resolveSupabasePublicConfig();
  if (!config) {
    return null;
  }
  const { url, anonKey } = config;
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as AppSupabaseClient;

  const user = await getSessionUser(client);
  if (!user) {
    return null;
  }

  return { userId: user.id, supabase: client };
}
