#!/usr/bin/env node
/**
 * Run one SQL query against the local Supabase Postgres stack.
 * Usage: pnpm supabase:query -- "select 1"
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const supabaseBin =
  process.platform === 'win32'
    ? path.join(root, 'node_modules', '.bin', 'supabase.cmd')
    : path.join(root, 'node_modules', '.bin', 'supabase');

// pnpm forwards `--` before the SQL; Supabase CLI treats leading `--` as flags.
const sql = process.argv
  .slice(2)
  .filter((arg) => arg !== '--')
  .join(' ')
  .trim();
if (!sql) {
  console.error('Usage: pnpm supabase:query "select 1"');
  console.error('       pnpm supabase:query -- "select 1"');
  process.exit(1);
}

const result = spawnSync(supabaseBin, ['db', 'query', sql], {
  cwd: root,
  encoding: 'utf8',
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
