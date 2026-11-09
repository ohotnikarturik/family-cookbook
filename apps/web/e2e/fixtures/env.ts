import fs from 'node:fs';
import path from 'node:path';

/** Playwright runs with cwd `apps/web`; avoid import.meta (config loads as CJS). */
const envLocalPath = path.join(process.cwd(), '.env.local');

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

export function hydrateWebEnvFromLocalFile(): void {
  if (!fs.existsSync(envLocalPath)) {
    return;
  }
  const text = fs.readFileSync(envLocalPath, 'utf8');
  for (const key of [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_APP_URL',
  ]) {
    const value = readEnvValue(text, key);
    if (value && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function resolvePublicSupabaseEnv(): { url: string; anonKey: string } | null {
  hydrateWebEnvFromLocalFile();
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  if (!url || !anonKey || url.includes('example.invalid')) {
    return null;
  }
  return { url, anonKey };
}

export async function isLocalE2eStackReady(): Promise<boolean> {
  const config = resolvePublicSupabaseEnv();
  if (!config) {
    return false;
  }
  try {
    const res = await fetch(`${config.url}/auth/v1/health`, { signal: AbortSignal.timeout(3_000) });
    return res.ok;
  } catch {
    return false;
  }
}
