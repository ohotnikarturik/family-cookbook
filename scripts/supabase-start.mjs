#!/usr/bin/env node
/**
 * Start local Supabase. Retries without Studio when Docker cannot bind-mount
 * supabase/snippets (common on macOS for repos under ~/Desktop).
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const supabaseBin =
  process.platform === 'win32'
    ? path.join(root, 'node_modules', '.bin', 'supabase.cmd')
    : path.join(root, 'node_modules', '.bin', 'supabase');

function runStart(args) {
  return spawnSync(supabaseBin, ['start', ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

function emit(result) {
  const text = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (text) {
    process.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
  }
}

const first = runStart([]);
emit(first);

if ((first.status ?? 1) === 0) {
  process.exit(0);
}

const output = `${first.stdout ?? ''}${first.stderr ?? ''}`;
const studioMountFailure =
  /supabase_studio|supabase\/snippets|ContainerStartError|operation not permitted/i.test(output);

if (!studioMountFailure) {
  process.exit(first.status ?? 1);
}

console.error(
  '\n---\nSupabase Studio could not start (Docker mount on supabase/snippets).\n' +
    'This is common on macOS when the repo is under ~/Desktop. Retrying without Studio\n' +
    'so Postgres, Auth, API, and Mailpit still run.\n\n' +
    'Browse data: pnpm supabase:query -- "select email from auth.users"\n' +
    'Enable Studio: docs/LOCAL_SUPABASE.md#studio-on-macos\n' +
    'Force full start (fail if Studio fails): pnpm supabase:start:full\n---\n',
);

const fallback = runStart(['-x', 'studio']);
emit(fallback);
process.exit(fallback.status ?? 1);
