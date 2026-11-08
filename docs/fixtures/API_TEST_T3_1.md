# T3.1 — Recipe media upload API (no UI)

Local stack only. Use **http://localhost:3003** for the web app and sign in so session cookies are set for API calls.

## Prep

1. `pnpm supabase:start`
2. `pnpm supabase:reset`
3. `pnpm supabase:sync-env`
4. `pnpm dev:web`
5. Sign in as **editor-a@family-cookbook.test** (Mailpit OTP).

## Fixture IDs

| Item | Value |
| --- | --- |
| Family A | `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa` |
| Recipe (buns) | `eeeeeeee-eeee-4eee-8eee-eeeeeeee0101` |

## 1. Create upload slot

```bash
curl -sS -X POST \
  'http://localhost:3003/api/families/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/recipes/eeeeeeee-eeee-4eee-8eee-eeeeeeee0101/uploads' \
  -H 'Content-Type: application/json' \
  -b 'cookies-from-browser' \
  -d '{
    "assetKind": "recipe_photo",
    "declaredMimeType": "image/png",
    "declaredByteSize": 68,
    "originalFilename": "test.png"
  }'
```

Expect **201** with `assetId`, `objectPath`, `signedUploadUrl`, `expiresAt`.

## 2. Upload bytes to Storage

Use the `signedUploadUrl` from step 1 with **PUT** and `Content-Type: image/png`. Body can be a minimal PNG (68-byte test file) matching `declaredByteSize`.

## 3. Finalize

```bash
curl -sS -X POST \
  "http://localhost:3003/api/families/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/recipes/eeeeeeee-eeee-4eee-8eee-eeeeeeee0101/uploads/<assetId>/finalize" \
  -b 'cookies-from-browser'
```

Expect **200** with `processingStatus: "available"` and `checksumSha256`.

## Negative checks

- **viewer-a** → slot returns **403**
- Declared MIME `image/jpeg` but PNG bytes → finalize **422** `rejected`
- `declaredByteSize` larger than allowlist → slot **400**

## Verify in SQL (optional)

```bash
pnpm supabase:query -- "select id, processing_status, byte_size from recipe_assets where recipe_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid"
```
