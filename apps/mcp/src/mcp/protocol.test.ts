import { Client } from '@modelcontextprotocol/client';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { describe, expect, it } from 'vitest';

import { createMcpApp } from '../app.js';
import { localAppRequest, localMcpFetch } from '../test/request.js';
import { MCP_TOOL_NAMES } from './register-tools.js';

describe('MCP protocol (Gate 1)', () => {
  it('responds on POST /mcp', async () => {
    const app = createMcpApp({ enableOAuth: false });
    const res = await app.fetch(
      localAppRequest('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
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
    expect(res.status).toBe(200);
  });

  it('lists eight family cookbook tools', async () => {
    const app = createMcpApp({ enableOAuth: false });
    const url = new URL('http://127.0.0.1:8787/mcp');
    const transport = new StreamableHTTPClientTransport(url, {
      fetch: localMcpFetch((req) => app.fetch(req)),
    });
    const client = new Client({ name: 'vitest', version: '0' });
    await client.connect(transport);
    const listed = await client.listTools();
    const names = listed.tools.map((t) => t.name).sort();
    expect(names).toEqual([...MCP_TOOL_NAMES].sort());
    await client.close();
  });

  it('returns AUTH_REQUIRED when calling a tool without auth context', async () => {
    const app = createMcpApp({ enableOAuth: false });
    const url = new URL('http://127.0.0.1:8787/mcp');
    const transport = new StreamableHTTPClientTransport(url, {
      fetch: localMcpFetch((req) => app.fetch(req)),
    });
    const client = new Client({ name: 'vitest', version: '0' });
    await client.connect(transport);
    const result = await client.callTool({ name: 'list_my_families', arguments: {} });
    expect(result.isError).toBe(true);
    const text = result.content?.[0];
    expect(text?.type).toBe('text');
    if (text?.type === 'text') {
      const payload = JSON.parse(text.text) as { code: string };
      expect(payload.code).toBe('AUTH_REQUIRED');
    }
    await client.close();
  });
});
