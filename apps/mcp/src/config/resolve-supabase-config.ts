import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

export function resolveSupabasePublicConfig(): { url: string; anonKey: string } | null {
  const fromFile = readWebEnvLocal();
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? fromFile.url;
  const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? fromFile.anonKey;
  if (!url || !anonKey) {
    return null;
  }
  return { url, anonKey };
}
