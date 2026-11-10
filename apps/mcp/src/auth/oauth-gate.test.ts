import { describe, expect, it } from 'vitest';

import { createMcpApp } from '../app.js';
import { resolveSupabasePublicConfig } from '../config/resolve-supabase-config.js';
import { localAppRequest } from '../test/request.js';

const hasSupabaseConfig = resolveSupabasePublicConfig() !== null;

describe.skipIf(!hasSupabaseConfig)('MCP OAuth gate (Gate 3 partial)', () => {
  it('rejects unauthenticated POST /mcp when OAuth is enabled', async () => {
    const app = createMcpApp({ enableOAuth: true });
    const res = await app.fetch(
      localAppRequest('/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'test', version: '0' },
          },
        }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('serves protected resource metadata when OAuth is enabled', async () => {
    const app = createMcpApp({ enableOAuth: true });
    const res = await app.fetch(localAppRequest('/mcp/oauth-protected-resource'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { resource?: string; authorization_servers?: string[] };
    expect(body.resource).toContain('/mcp');
    expect(body.authorization_servers?.length).toBeGreaterThan(0);
  });
});
