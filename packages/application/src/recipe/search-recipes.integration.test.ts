import type { AppSupabaseClient } from '@family-cookbook/data-access';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, beforeAll } from 'vitest';

import { listRecipeBrowseOptions } from './list-recipe-browse-options.js';
import { searchRecipes } from './search-recipes.js';

const FAMILY_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const FAMILY_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const OWNER_A = '11111111-1111-4111-8111-111111111101';
const EDITOR_A = '11111111-1111-4111-8111-111111111102';
const CONTRIBUTOR_B = '22222222-2222-4222-8222-222222222202';
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
  const url = readEnvValue(text, 'NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = readEnvValue(text, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const out: { url?: string; anonKey?: string } = {};
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

async function signInClient(email: string): Promise<AppSupabaseClient | null> {
  const config = resolveSupabaseConfig();
  if (!config) {
    return null;
  }
  const client = createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: LOCAL_PASSWORD });
  if (error) {
    return null;
  }
  return client as unknown as AppSupabaseClient;
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

const stackReady = await isLocalStackReady();

describe.skipIf(!stackReady)('searchRecipes integration (local Supabase)', () => {
  let ownerAClient: AppSupabaseClient;

  beforeAll(async () => {
    const client = await signInClient('owner-a@family-cookbook.test');
    if (!client) {
      throw new Error('Could not sign in seeded owner-a for integration tests');
    }
    ownerAClient = client;
  });

  it('filters Family A recipes by contributor (createdBy)', async () => {
    const ownerOnly = await searchRecipes(ownerAClient, {
      familyId: FAMILY_A,
      createdBy: OWNER_A,
      limit: 50,
    });
    expect(ownerOnly.status).toBe('ok');
    if (ownerOnly.status !== 'ok') {
      return;
    }
    expect(ownerOnly.result.items.length).toBe(30);
    expect(ownerOnly.result.items.every((item) => item.createdBy === OWNER_A)).toBe(true);

    const editorOnly = await searchRecipes(ownerAClient, {
      familyId: FAMILY_A,
      createdBy: EDITOR_A,
      limit: 50,
    });
    expect(editorOnly.status).toBe('ok');
    if (editorOnly.status !== 'ok') {
      return;
    }
    expect(editorOnly.result.items).toHaveLength(0);

    const foreignAuthor = await searchRecipes(ownerAClient, {
      familyId: FAMILY_A,
      createdBy: CONTRIBUTOR_B,
      limit: 10,
    });
    expect(foreignAuthor.status).toBe('ok');
    if (foreignAuthor.status !== 'ok') {
      return;
    }
    expect(foreignAuthor.result.items).toHaveLength(0);
  });

  it('anyText finds a recipe by an ingredient name that is not in its text', async () => {
    const plain = await searchRecipes(ownerAClient, { familyId: FAMILY_A, query: 'yeast' });
    expect(plain.status).toBe('ok');
    if (plain.status !== 'ok') {
      return;
    }
    expect(plain.result.items).toHaveLength(0);

    const any = await searchRecipes(ownerAClient, { familyId: FAMILY_A, anyText: 'yeast' });
    expect(any.status).toBe('ok');
    if (any.status !== 'ok') {
      return;
    }
    expect(any.result.items.map((item) => item.title)).toEqual(["Grandma's cardamom buns"]);
    expect(any.result.totalCount).toBe(1);
  });

  it('anyText matches a partial title and a description word', async () => {
    const partialTitle = await searchRecipes(ownerAClient, { familyId: FAMILY_A, anyText: 'salm' });
    expect(partialTitle.status).toBe('ok');
    if (partialTitle.status !== 'ok') {
      return;
    }
    expect(partialTitle.result.items.map((item) => item.title)).toContain('Weeknight salmon soup');

    const description = await searchRecipes(ownerAClient, {
      familyId: FAMILY_A,
      anyText: 'pearl',
    });
    expect(description.status).toBe('ok');
    if (description.status !== 'ok') {
      return;
    }
    expect(description.result.items.map((item) => item.title)).toContain("Grandma's cardamom buns");
  });

  it('anyText respects the archived rule', async () => {
    const hidden = await searchRecipes(ownerAClient, { familyId: FAMILY_A, anyText: 'beetroot' });
    expect(hidden.status).toBe('ok');
    if (hidden.status !== 'ok') {
      return;
    }
    expect(hidden.result.items).toHaveLength(0);

    const shown = await searchRecipes(ownerAClient, {
      familyId: FAMILY_A,
      anyText: 'beetroot',
      includeArchived: true,
    });
    expect(shown.status).toBe('ok');
    if (shown.status !== 'ok') {
      return;
    }
    expect(shown.result.items.map((item) => item.title)).toEqual(['Archived beet salad']);
  });

  it('anyText treats commas, quotes, parentheses and wildcards as plain text', async () => {
    for (const text of [
      'a,b)',
      '"quoted',
      'x") or id.not.is.null,("',
      '100%',
      'under_score',
      '\\',
    ]) {
      const result = await searchRecipes(ownerAClient, { familyId: FAMILY_A, anyText: text });
      expect(result.status).toBe('ok');
      if (result.status !== 'ok') {
        return;
      }
      expect(result.result.items).toHaveLength(0);
      expect(result.result.totalCount).toBe(0);
    }
  });

  it('anyText never returns another family’s recipes', async () => {
    const own = await searchRecipes(ownerAClient, { familyId: FAMILY_A, anyText: 'pancakes' });
    expect(own.status).toBe('ok');
    if (own.status !== 'ok') {
      return;
    }
    expect(own.result.items).toHaveLength(0);

    const foreign = await searchRecipes(ownerAClient, { familyId: FAMILY_B, anyText: 'pancakes' });
    expect(foreign.status).toBe('forbidden');
  });

  it('totalCount ignores the page cursor', async () => {
    const first = await searchRecipes(ownerAClient, { familyId: FAMILY_A, limit: 5 });
    expect(first.status).toBe('ok');
    if (first.status !== 'ok' || !first.result.nextCursor) {
      return;
    }
    const second = await searchRecipes(ownerAClient, {
      familyId: FAMILY_A,
      limit: 5,
      cursor: first.result.nextCursor,
    });
    expect(second.status).toBe('ok');
    if (second.status !== 'ok') {
      return;
    }
    expect(first.result.totalCount).toBe(30);
    expect(second.result.totalCount).toBe(30);
  });

  it('lists the categories, tags and languages Family A uses, without duplicates', async () => {
    const result = await listRecipeBrowseOptions(ownerAClient, { familyId: FAMILY_A });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }
    const { categories, tags, languages } = result.options;
    expect(categories).toContain('Baking');
    expect(categories.length).toBeLessThanOrEqual(50);
    expect(new Set(categories.map((value) => value.toLowerCase())).size).toBe(categories.length);
    expect(categories.filter((value) => value === 'Breakfast')).toHaveLength(1);
    expect(languages).toContain('en');
    expect(tags.length).toBeLessThanOrEqual(100);
  });

  it('refuses browse options for a family the caller is not in', async () => {
    const result = await listRecipeBrowseOptions(ownerAClient, { familyId: FAMILY_B });
    expect(result.status).toBe('forbidden');
    const invalid = await listRecipeBrowseOptions(ownerAClient, { familyId: 'not-a-uuid' });
    expect(invalid.status).toBe('validation_error');
  });

  it('never returns another family’s recipes for the same contributor id probe', async () => {
    const familyBProbe = await searchRecipes(ownerAClient, {
      familyId: FAMILY_B,
      createdBy: OWNER_A,
      limit: 10,
    });
    expect(familyBProbe.status).toBe('forbidden');
  });
});

describe.skipIf(!stackReady)('searchRecipes integration — Family B contributor filter', () => {
  it('returns contributor-authored recipes in their family', async () => {
    const client = await signInClient('owner-b@family-cookbook.test');
    expect(client).not.toBeNull();
    if (!client) {
      return;
    }

    const result = await searchRecipes(client, {
      familyId: FAMILY_B,
      createdBy: CONTRIBUTOR_B,
      limit: 10,
    });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }
    expect(result.result.items).toHaveLength(1);
    expect(result.result.items[0]?.title).toBe("Contributor's pancakes");
  });
});
