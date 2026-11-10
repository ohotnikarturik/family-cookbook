import { Client } from '@modelcontextprotocol/client';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import type { AppSupabaseClient } from '@family-cookbook/data-access';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

import { createMcpApp } from '../app.js';
import { localMcpFetch } from '../test/request.js';

const FAMILY_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const FAMILY_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const LOCAL_PASSWORD = 'LocalDev-Only-1';

function readEnvValue(text: string, key: string): string | undefined {
  const match = text.match(new RegExp(`^${key}=(.*)$`, 'm'));
  const raw = match?.[1]?.trim();
  if (!raw) {
    return undefined;
  }
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  return raw;
}

function readWebEnvLocal(): { url?: string; anonKey?: string } {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
  const envPath = path.join(root, 'apps', 'web', '.env.local');
  if (!fs.existsSync(envPath)) {
    return {};
  }
  const text = fs.readFileSync(envPath, 'utf8');
  const out: { url?: string; anonKey?: string } = {};
  const url = readEnvValue(text, 'NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = readEnvValue(text, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (url) {
    out.url = url;
  }
  if (anonKey) {
    out.anonKey = anonKey;
  }
  return out;
}

function resolveSupabaseConfig(): { url: string; anonKey: string } | null {
  const fromFile = readWebEnvLocal();
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? fromFile.url ?? 'http://127.0.0.1:54321';
  const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? fromFile.anonKey;
  if (!anonKey) {
    return null;
  }
  return { url, anonKey };
}

async function signInAndGetAccessToken(email: string): Promise<string | null> {
  const config = resolveSupabaseConfig();
  if (!config) {
    return null;
  }
  const client = createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: LOCAL_PASSWORD });
  if (error || !data.session?.access_token) {
    return null;
  }
  return data.session.access_token;
}

async function isLocalStackReady(): Promise<boolean> {
  const config = resolveSupabaseConfig();
  if (!config) {
    return false;
  }
  try {
    const res = await fetch(`${config.url}/auth/v1/health`, { signal: AbortSignal.timeout(2_000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function callToolWithBearer(
  toolName: string,
  args: Record<string, unknown>,
  accessToken: string,
): Promise<{ isError?: boolean; text: string }> {
  const app = createMcpApp({ enableOAuth: false });
  const url = new URL('http://127.0.0.1:8787/mcp');
  const transport = new StreamableHTTPClientTransport(url, {
    fetch: localMcpFetch((req) => {
      const headers = new Headers(req.headers);
      headers.set('Authorization', `Bearer ${accessToken}`);
      return app.fetch(new Request(req, { headers }));
    }),
  });
  const client = new Client({ name: 'integration', version: '0' });
  await client.connect(transport);
  const result = await client.callTool({ name: toolName, arguments: args });
  await client.close();
  const block = result.content?.[0];
  const text = block?.type === 'text' ? block.text : '';
  return { isError: result.isError, text };
}

const stackReady = await isLocalStackReady();

describe.skipIf(!stackReady)('MCP tools integration (local Supabase)', () => {
  let ownerToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    const owner = await signInAndGetAccessToken('owner-a@family-cookbook.test');
    const viewer = await signInAndGetAccessToken('viewer-a@family-cookbook.test');
    if (!owner || !viewer) {
      throw new Error('Could not sign in fixture users');
    }
    ownerToken = owner;
    viewerToken = viewer;
  });

  it('list_my_families returns memberships', async () => {
    const app = createMcpApp({ enableOAuth: false });
    const url = new URL('http://127.0.0.1:8787/mcp');
    const transport = new StreamableHTTPClientTransport(url, {
      fetch: localMcpFetch((req) => {
        const headers = new Headers(req.headers);
        headers.set('Authorization', `Bearer ${ownerToken}`);
        return app.fetch(new Request(req, { headers }));
      }),
    });
    const client = new Client({ name: 'integration', version: '0' });
    await client.connect(transport);
    const result = await client.callTool({ name: 'list_my_families', arguments: {} });
    expect(result.isError).toBeFalsy();
    const text = result.content?.[0]?.type === 'text' ? result.content[0].text : '';
    const payload = JSON.parse(text) as { families: { id: string }[] };
    expect(payload.families.some((f) => f.id === FAMILY_A)).toBe(true);
    await client.close();
  });

  it('search_recipes is family-scoped', async () => {
    const result = await callToolWithBearer(
      'search_recipes',
      { family_id: FAMILY_B },
      ownerToken,
    );
    expect(result.isError).toBeFalsy();
    const payload = JSON.parse(result.text) as { items: unknown[] };
    expect(payload.items.length).toBe(0);
  });

  it('viewer cannot create_recipe', async () => {
    const result = await callToolWithBearer(
      'create_recipe',
      {
        family_id: FAMILY_A,
        recipe: { title: 'MCP forbidden', sourceLanguage: 'en' },
      },
      viewerToken,
    );
    expect(result.isError).toBe(true);
    const payload = JSON.parse(result.text) as { code: string };
    expect(payload.code).toBe('FORBIDDEN');
  });
});
