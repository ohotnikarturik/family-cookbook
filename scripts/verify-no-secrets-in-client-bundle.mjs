#!/usr/bin/env node
/**
 * Heuristic scan of Next.js client bundle output for high-signal secret material.
 * Run after `pnpm build` (expects apps/web/.next). No production dependency.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const nextDir = path.join(repoRoot, 'apps/web/.next');

/** @type {RegExp[]} */
const patterns = [
  /SUPABASE_SERVICE_ROLE/i,
  /service_role["']?\s*:\s*["'][^"']{20,}/i,
  /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/,
  /sk_live_[0-9a-zA-Z]{20,}/,
  /ghp_[0-9a-zA-Z]{36}/,
];

/**
 * @param {string} dir
 * @returns {Generator<string>}
 */
function* walkFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      yield* walkFiles(full);
    } else {
      yield full;
    }
  }
}

if (!fs.existsSync(nextDir)) {
  console.error('Expected Next output at apps/web/.next — run `pnpm build` first.');
  process.exit(2);
}

let failed = false;
for (const file of walkFiles(nextDir)) {
  if (!/\.(js|css)$/.test(file) || file.endsWith('.map')) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const re of patterns) {
    if (re.test(content)) {
      console.error(
        `verify-no-secrets-in-client-bundle: pattern ${re} matched in ${path.relative(repoRoot, file)}`,
      );
      failed = true;
    }
  }
}

if (failed) {
  console.error('Client bundle scan failed (possible secret material in static assets).');
  process.exit(1);
}

console.info('Client bundle scan passed (apps/web/.next static js/css).');
process.exit(0);
