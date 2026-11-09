#!/usr/bin/env node
/**
 * Local-only: pg_dump → delete recipes → restore → count check → pgTAP.
 * Requires `pnpm supabase:start` and a seeded DB (`pnpm supabase:reset`).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backupDir = path.join(root, 'var', 'backup-drill');
const dumpPath = path.join(backupDir, 'local-drill.sql');

/**
 * Recipe aggregate tables that CASCADE from `delete from public.recipes`.
 * `audit_events` is family-scoped (ON DELETE RESTRICT) — not dumped here.
 * Order: parents before children so `recipe_steps.media_asset_id` can restore.
 */
const RECIPE_AGGREGATE_TABLES = [
  'public.recipes',
  'public.recipe_assets',
  'public.recipe_ingredients',
  'public.recipe_steps',
  'public.recipe_tags',
  'public.recipe_translations',
  'public.recipe_ingredient_translations',
  'public.recipe_step_translations',
  'public.recipe_revisions',
];

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    encoding: 'utf8',
    cwd: root,
    stdio: opts.inherit ? 'inherit' : 'pipe',
    input: opts.input,
    maxBuffer: 64 * 1024 * 1024,
    ...opts,
  });
}

function findDbContainer() {
  const containers = run('docker', ['ps', '--format', '{{.Names}}']);
  if (containers.status !== 0) {
    throw new Error(containers.stderr || 'docker ps failed');
  }
  const name = containers.stdout
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('supabase_db_'));
  if (!name) {
    throw new Error('No running supabase_db_* container. Run pnpm supabase:start first.');
  }
  return name;
}

function psqlExec(container, sql, { tuplesOnly = false } = {}) {
  const args = [
    'exec',
    container,
    'psql',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    ...(tuplesOnly ? ['-t', '-A'] : []),
    '-c',
    sql,
  ];
  const result = run('docker', args);
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `psql failed: ${sql.slice(0, 80)}`);
  }
  return (result.stdout ?? '').trim();
}

function recipeCount(container) {
  const raw = psqlExec(container, 'select count(*)::text from public.recipes;', {
    tuplesOnly: true,
  });
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) {
    throw new Error(`Unexpected recipe count: ${raw}`);
  }
  return n;
}

function main() {
  const container = findDbContainer();
  fs.mkdirSync(backupDir, { recursive: true });

  const baseline = recipeCount(container);
  if (baseline === 0) {
    throw new Error('Expected seeded recipes. Run pnpm supabase:reset first.');
  }
  console.log(`Baseline recipes: ${baseline}`);

  const dump = run('docker', [
    'exec',
    container,
    'pg_dump',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '--data-only',
    '--inserts',
    '--no-owner',
    '--no-acl',
    ...RECIPE_AGGREGATE_TABLES.flatMap((table) => ['-t', table]),
  ]);
  if (dump.status !== 0) {
    throw new Error(dump.stderr || 'pg_dump failed');
  }
  fs.writeFileSync(dumpPath, dump.stdout, 'utf8');
  console.log(`Wrote ${path.relative(root, dumpPath)}`);

  psqlExec(container, 'delete from public.recipes;');
  const afterDelete = recipeCount(container);
  if (afterDelete !== 0) {
    throw new Error(`Recipes still present after delete (${afterDelete})`);
  }
  console.log('Simulated data loss: recipes table empty');

  const restore = run(
    'docker',
    ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'],
    { input: fs.readFileSync(dumpPath, 'utf8'), stdio: ['pipe', 'inherit', 'inherit'] },
  );
  if (restore.status !== 0) {
    throw new Error('Restore from dump failed');
  }

  const afterRestore = recipeCount(container);
  if (afterRestore !== baseline) {
    throw new Error(`Recipe count mismatch after restore: ${afterRestore} !== ${baseline}`);
  }
  console.log('Recipe count matches baseline after restore');

  console.log('Running pgTAP (pnpm supabase:test)...');
  const pgtap = run('pnpm', ['supabase:test'], { inherit: true });
  if (pgtap.status !== 0) {
    process.exit(pgtap.status ?? 1);
  }

  console.log('Backup/restore drill completed successfully.');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
