#!/usr/bin/env node
/**
 * Write local Supabase URL + anon key for Next.js (NEXT_PUBLIC_*).
 * Target: apps/web/.env.local (Next loads env from the app package directory).
 * Does not write service_role. Requires `pnpm supabase:start` to be running.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const supabaseBin =
  process.platform === 'win32'
    ? path.join(root, 'node_modules', '.bin', 'supabase.cmd')
    : path.join(root, 'node_modules', '.bin', 'supabase');
const envLocalPath = path.join(root, 'apps', 'web', '.env.local');

function parseEnvExport(text, key) {
  const match = text.match(new RegExp(`^${key}="([^"]*)"`, 'm'));
  return match?.[1];
}

const status = spawnSync(supabaseBin, ['status', '-o', 'env'], {
  cwd: root,
  encoding: 'utf8',
});

if (status.status !== 0) {
  console.error(status.stderr || status.stdout || 'supabase status failed');
  console.error('Start the stack first: pnpm supabase:start');
  process.exit(status.status ?? 1);
}

const apiUrl = parseEnvExport(status.stdout, 'API_URL');
const anonKey = parseEnvExport(status.stdout, 'ANON_KEY');

if (!apiUrl || !anonKey) {
  console.error('Could not read API_URL / ANON_KEY from supabase status');
  process.exit(1);
}

const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3003';

const lines = new Map();
if (fs.existsSync(envLocalPath)) {
  for (const line of fs.readFileSync(envLocalPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      lines.set(`__comment__${lines.size}`, line);
      continue;
    }
    const eq = line.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    lines.set(key, line);
  }
}

lines.set('NEXT_PUBLIC_SUPABASE_URL', `NEXT_PUBLIC_SUPABASE_URL=${apiUrl}`);
lines.set('NEXT_PUBLIC_SUPABASE_ANON_KEY', `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`);
lines.set('NEXT_PUBLIC_APP_URL', `NEXT_PUBLIC_APP_URL=${appUrl}`);

if (!lines.has('SUPABASE_PROJECT_ID')) {
  lines.set('SUPABASE_PROJECT_ID', 'SUPABASE_PROJECT_ID=family-cookbook');
}

const orderedKeys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_APP_URL',
  'SUPABASE_PROJECT_ID',
];

const body = [];
const seen = new Set();
for (const key of orderedKeys) {
  const line = lines.get(key);
  if (line) {
    body.push(line);
    seen.add(key);
  }
}
for (const [key, line] of lines) {
  if (key.startsWith('__comment__')) {
    body.push(line);
    continue;
  }
  if (!seen.has(key)) {
    body.push(line);
  }
}

fs.writeFileSync(envLocalPath, `${body.join('\n').trimEnd()}\n`, 'utf8');
console.log(`Updated ${path.relative(root, envLocalPath)}`);
console.log(`  NEXT_PUBLIC_SUPABASE_URL=${apiUrl}`);
console.log('Restart `pnpm dev:web` if it is already running.');
