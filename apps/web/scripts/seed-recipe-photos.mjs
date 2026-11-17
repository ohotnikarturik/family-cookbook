#!/usr/bin/env node
/**
 * LOCAL DEVELOPMENT ONLY. Adds a dish photo to four seeded Family A recipes so photo cards,
 * the detail hero and the gallery can be reviewed (EPIC 3.8 W38.0).
 *
 * Uses the same application use cases as the web upload route: upload slot → signed PUT →
 * finalize (signature check, checksum, status). Signs in as Owner A with the local seed password;
 * no service-role key, no direct storage-row writes. The pictures are drawn here (simple plates
 * of food as PNG), so the repository holds no third-party images.
 *
 * Usage (from the repo root, after `pnpm supabase:reset`): pnpm supabase:seed-photos
 * Safe to re-run: recipes that already have an available dish photo are skipped.
 * Never logs signed URLs or tokens.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

import { createRecipeUploadSlot, finalizeRecipeUpload } from '@family-cookbook/application';
import { createClient } from '@supabase/supabase-js';

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FAMILY_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OWNER_A_EMAIL = 'owner-a@family-cookbook.test';
const LOCAL_DEV_PASSWORD = 'LocalDev-Only-1';

const TARGETS = [
  { recipeId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0104', file: 'borscht.png', paint: paintBorscht },
  { recipeId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0105', file: 'syrniki.png', paint: paintSyrniki },
  {
    recipeId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0106',
    file: 'karjalanpiirakat.png',
    paint: paintKarelianPies,
  },
  {
    recipeId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0107',
    file: 'mustikkapiirakka.png',
    paint: paintBlueberryPie,
  },
];

// ---------------------------------------------------------------------------
// Environment and safety
// ---------------------------------------------------------------------------

function readLocalEnv() {
  const file = path.join(WEB_ROOT, '.env.local');
  if (!fs.existsSync(file)) {
    throw new Error('apps/web/.env.local is missing. Run `pnpm supabase:sync-env` first.');
  }
  const values = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) {
      values[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  const url = values['NEXT_PUBLIC_SUPABASE_URL'];
  const anonKey = values['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  if (!url || !anonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing in .env.local.',
    );
  }
  const host = new URL(url).hostname;
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error(`Refusing to seed photos into a non-local Supabase (${host}).`);
  }
  return { url, anonKey };
}

// ---------------------------------------------------------------------------
// Minimal RGB canvas + PNG encoder (no dependencies)
// ---------------------------------------------------------------------------

const W = 960;
const H = 720;

function createCanvas(fill) {
  const pixels = new Float32Array(W * H * 3);
  for (let i = 0; i < W * H; i += 1) {
    pixels[i * 3] = fill[0];
    pixels[i * 3 + 1] = fill[1];
    pixels[i * 3 + 2] = fill[2];
  }
  return pixels;
}

function hex(value) {
  const n = Number.parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Anti-aliased ellipse. `color` is an RGB array or a function (x, y, t) → RGB, t = 0 centre … 1 edge. */
function ellipse(px, cx, cy, rx, ry, color, alpha = 1) {
  const x0 = Math.max(0, Math.floor(cx - rx - 2));
  const x1 = Math.min(W - 1, Math.ceil(cx + rx + 2));
  const y0 = Math.max(0, Math.floor(cy - ry - 2));
  const y1 = Math.min(H - 1, Math.ceil(cy + ry + 2));
  const scale = Math.min(rx, ry);
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      const t = Math.sqrt(nx * nx + ny * ny);
      const coverage = Math.min(1, Math.max(0, 0.5 - (t - 1) * scale));
      if (coverage <= 0) {
        continue;
      }
      const rgb = typeof color === 'function' ? color(x, y, Math.min(t, 1)) : color;
      const a = coverage * alpha;
      const i = (y * W + x) * 3;
      px[i] += (rgb[0] - px[i]) * a;
      px[i + 1] += (rgb[1] - px[i + 1]) * a;
      px[i + 2] += (rgb[2] - px[i + 2]) * a;
    }
  }
}

function circle(px, cx, cy, r, color, alpha = 1) {
  ellipse(px, cx, cy, r, r, color, alpha);
}

/** Soft drop shadow made of stacked translucent ellipses. */
function shadow(px, cx, cy, rx, ry, strength = 0.35) {
  const steps = 18;
  for (let k = steps; k >= 0; k -= 1) {
    ellipse(px, cx + 10, cy + 16, rx + k * 1.6, ry + k * 1.6, [40, 26, 16], strength / steps);
  }
}

function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function woodTable(base) {
  const px = createCanvas(base);
  const plank = 144;
  for (let y = 0; y < H; y += 1) {
    const row = Math.floor(y / plank);
    const tone = row % 2 === 0 ? 0 : -10;
    const grain = Math.sin(y * 0.21 + row * 3) * 4 + Math.sin(y * 0.047 + row) * 6;
    const seam = y % plank < 2 ? -38 : 0;
    for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 3;
      const wave = Math.sin(x * 0.012 + row * 1.7) * 3;
      const d = tone + grain + seam + wave;
      px[i] += d;
      px[i + 1] += d * 0.8;
      px[i + 2] += d * 0.6;
    }
  }
  return px;
}

function plate(px, cx, cy, r) {
  shadow(px, cx, cy, r, r);
  circle(px, cx, cy, r, (_x, _y, t) => mix(hex('#fbf8f2'), hex('#e9e2d6'), t * t));
  circle(px, cx, cy, r * 0.74, (_x, _y, t) => mix(hex('#f1ece3'), hex('#e3dacb'), t));
}

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let k = 0; k < 8; k += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(px) {
  const stride = W * 3;
  const raw = Buffer.alloc((stride + 1) * H);
  for (let y = 0; y < H; y += 1) {
    const out = y * (stride + 1);
    raw[out] = 1; // "Sub" filter compresses smooth gradients well.
    for (let x = 0; x < stride; x += 1) {
      const value = Math.max(0, Math.min(255, Math.round(px[y * stride + x])));
      const left = x >= 3 ? Math.max(0, Math.min(255, Math.round(px[y * stride + x - 3]))) : 0;
      raw[out + 1 + x] = (value - left) & 255;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(W, 0);
  header.writeUInt32BE(H, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Dishes
// ---------------------------------------------------------------------------

function paintBorscht() {
  const px = woodTable(hex('#8a5f3d'));
  const random = rng(104);
  plate(px, 480, 370, 300);
  circle(px, 480, 362, 212, (_x, _y, t) => mix(hex('#f6f1e8'), hex('#d9cfbf'), t));
  circle(px, 480, 362, 190, (_x, _y, t) => mix(hex('#b2263c'), hex('#6e1324'), t * t));
  for (let k = 0; k < 26; k += 1) {
    const angle = random() * Math.PI * 2;
    const dist = random() * 150;
    ellipse(
      px,
      480 + Math.cos(angle) * dist,
      362 + Math.sin(angle) * dist,
      16,
      6,
      hex('#7d1428'),
      0.6,
    );
  }
  circle(px, 510, 340, 52, (_x, _y, t) => mix(hex('#fffdf8'), hex('#efe6d8'), t));
  for (let k = 0; k < 40; k += 1) {
    const angle = random() * Math.PI * 2;
    const dist = 30 + random() * 140;
    circle(
      px,
      480 + Math.cos(angle) * dist,
      362 + Math.sin(angle) * dist,
      3 + random() * 3,
      hex('#4f7a2c'),
    );
  }
  shadow(px, 820, 600, 70, 60, 0.25);
  circle(px, 820, 600, 70, (_x, _y, t) => mix(hex('#e9b56a'), hex('#a8692f'), t));
  return px;
}

function paintSyrniki() {
  const px = woodTable(hex('#a27650'));
  const random = rng(105);
  plate(px, 480, 360, 300);
  const discs = [
    [400, 300],
    [560, 300],
    [400, 450],
    [560, 450],
  ];
  for (const [x, y] of discs) {
    shadow(px, x, y, 84, 84, 0.18);
    circle(px, x, y, 84, (_x, _y, t) => mix(hex('#f2c879'), hex('#a8622a'), Math.pow(t, 3)));
    circle(px, x - 14, y - 14, 30, hex('#fbe2a8'), 0.35);
  }
  circle(px, 480, 375, 46, (_x, _y, t) => mix(hex('#fffdf8'), hex('#eee4d4'), t));
  for (let k = 0; k < 9; k += 1) {
    const x = 640 + random() * 90;
    const y = 520 + random() * 70;
    circle(px, x, y, 13, (_x, _y, t) => mix(hex('#e0435b'), hex('#9c1a33'), t));
  }
  return px;
}

function paintKarelianPies() {
  const px = woodTable(hex('#7b5537'));
  const random = rng(106);
  shadow(px, 480, 370, 360, 250, 0.3);
  ellipse(px, 480, 370, 360, 250, (_x, _y, t) => mix(hex('#f4ede0'), hex('#ddd2bf'), t * t));
  const pies = [
    [380, 290, -0.2],
    [600, 300, 0.15],
    [470, 470, 0],
  ];
  for (const [x, y] of pies) {
    shadow(px, x, y, 130, 72, 0.18);
    ellipse(px, x, y, 130, 72, (_x, _y, t) => mix(hex('#9b6b44'), hex('#5f3b22'), t * t));
    ellipse(px, x, y, 100, 46, (_x, _y, t) => mix(hex('#f6e6bb'), hex('#e2c58a'), t));
    for (let k = 0; k < 10; k += 1) {
      circle(
        px,
        x - 80 + random() * 160,
        y - 30 + random() * 60,
        4 + random() * 5,
        hex('#c08a4a'),
        0.7,
      );
    }
    ellipse(px, x + 10, y - 4, 34, 18, (_x, _y, t) => mix(hex('#fff4c8'), hex('#f0d27a'), t));
  }
  return px;
}

function paintBlueberryPie() {
  const px = woodTable(hex('#93694a'));
  const random = rng(107);
  shadow(px, 480, 360, 300, 300, 0.32);
  circle(px, 480, 360, 300, (_x, _y, t) => mix(hex('#b9bcc2'), hex('#7d8188'), t));
  circle(px, 480, 360, 276, (_x, _y, t) => mix(hex('#e7b569'), hex('#b67a35'), Math.pow(t, 2)));
  circle(px, 480, 360, 236, (_x, _y, t) => mix(hex('#4a3570'), hex('#2a1d45'), t));
  for (let k = 0; k < 120; k += 1) {
    const angle = random() * Math.PI * 2;
    const dist = Math.sqrt(random()) * 220;
    const x = 480 + Math.cos(angle) * dist;
    const y = 360 + Math.sin(angle) * dist;
    circle(px, x, y, 11, (_x, _y, t) => mix(hex('#5b4a8f'), hex('#231a3d'), t));
    circle(px, x - 3, y - 3, 3, hex('#9e93c9'), 0.6);
  }
  for (let k = 0; k < 7; k += 1) {
    const angle = random() * Math.PI * 2;
    const dist = random() * 150;
    ellipse(
      px,
      480 + Math.cos(angle) * dist,
      360 + Math.sin(angle) * dist,
      46,
      24,
      hex('#f3ecf2'),
      0.85,
    );
  }
  return px;
}

// ---------------------------------------------------------------------------
// Upload through the application use cases
// ---------------------------------------------------------------------------

async function hasDishPhoto(client, recipeId) {
  const { data, error } = await client
    .from('recipe_assets')
    .select('id')
    .eq('family_id', FAMILY_A)
    .eq('recipe_id', recipeId)
    .eq('asset_kind', 'recipe_photo')
    .eq('processing_status', 'available')
    .limit(1);
  if (error) {
    throw new Error(`Could not read existing photos for ${recipeId}.`);
  }
  return data.length > 0;
}

async function uploadPhoto(client, target) {
  const bytes = encodePng(target.paint());
  const slot = await createRecipeUploadSlot(client, {
    familyId: FAMILY_A,
    recipeId: target.recipeId,
    assetKind: 'recipe_photo',
    declaredMimeType: 'image/png',
    declaredByteSize: bytes.length,
    originalFilename: target.file,
  });
  if (slot.status !== 'ok') {
    throw new Error(`Upload slot failed for ${target.file}: ${slot.status}`);
  }

  const put = await fetch(slot.result.signedUploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: bytes,
  });

  const finalized = await finalizeRecipeUpload(client, {
    familyId: FAMILY_A,
    recipeId: target.recipeId,
    assetId: slot.result.assetId,
  });
  if (!put.ok || finalized.status !== 'ok') {
    throw new Error(
      `Upload failed for ${target.file}: PUT ${put.status}, finalize ${finalized.status}`,
    );
  }
  return bytes.length;
}

async function main() {
  const { url, anonKey } = readLocalEnv();
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: OWNER_A_EMAIL,
    password: LOCAL_DEV_PASSWORD,
  });
  if (error) {
    throw new Error(`Sign-in as ${OWNER_A_EMAIL} failed. Is the local seed loaded?`);
  }

  for (const target of TARGETS) {
    if (await hasDishPhoto(client, target.recipeId)) {
      console.log(`skip  ${target.file} (recipe already has a dish photo)`);
      continue;
    }
    const size = await uploadPhoto(client, target);
    console.log(`added ${target.file} (${Math.round(size / 1024)} KiB)`);
  }
  await client.auth.signOut();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'seed-recipe-photos failed');
  process.exit(1);
});
