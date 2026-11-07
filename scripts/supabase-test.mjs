#!/usr/bin/env node
/**
 * Run pgTAP SQL tests against the local Supabase Postgres container.
 * Uses docker exec when `supabase test db` cannot mount the repo (common on macOS Desktop paths).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testsDir = path.join(root, 'supabase', 'tests');

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    encoding: 'utf8',
    stdio: opts.inherit ? 'inherit' : 'pipe',
    input: opts.input,
    ...opts,
  });
  return result;
}

const containers = run('docker', ['ps', '--format', '{{.Names}}']);
if (containers.status !== 0) {
  console.error(containers.stderr || 'docker ps failed');
  process.exit(containers.status ?? 1);
}

const dbContainer = containers.stdout
  .split('\n')
  .map((line) => line.trim())
  .find((name) => name.startsWith('supabase_db_'));

if (!dbContainer) {
  console.error('No running supabase_db_* container. Run pnpm supabase:start first.');
  process.exit(1);
}

const enablePgtap = run('docker', [
  'exec',
  dbContainer,
  'psql',
  '-U',
  'postgres',
  '-d',
  'postgres',
  '-v',
  'ON_ERROR_STOP=1',
  '-c',
  'create extension if not exists pgtap with schema extensions;',
]);
if (enablePgtap.status !== 0) {
  console.error(enablePgtap.stderr || enablePgtap.stdout);
  process.exit(enablePgtap.status ?? 1);
}

const files = fs
  .readdirSync(testsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort()
  .map((name) => path.join(testsDir, name));

let failed = false;
for (const file of files) {
  const sql = fs.readFileSync(file, 'utf8');
  console.log(`=== ${path.relative(root, file)} ===`);
  const result = run(
    'docker',
    [
      'exec',
      '-i',
      dbContainer,
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    { input: sql, stdio: ['pipe', 'inherit', 'inherit'] },
  );
  if (result.status !== 0) {
    failed = true;
    break;
  }
}

process.exit(failed ? 1 : 0);
