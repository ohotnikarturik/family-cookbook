# T3.2 — Recipe media gallery (UI)

Shows photos and PDF sources on the recipe **detail** page. Upload still uses the T3.1 API ([`API_TEST_T3_1.md`](API_TEST_T3_1.md)).

## Prep

1. `pnpm supabase:start` && `pnpm supabase:reset` && `pnpm supabase:sync-env`
2. `pnpm dev:web`
3. Sign in as **editor-a@family-cookbook.test** (Mailpit OTP).

## Upload at least one image and one PDF

Follow [`API_TEST_T3_1.md`](API_TEST_T3_1.md) for the fixture recipe in Family A:

1. Create an upload slot (`recipe_photo` JPEG and `original_document` PDF).
2. `PUT` bytes to `signedUploadUrl`.
3. Call finalize for each `assetId` until `processingStatus` is `available`.

## Verify on detail page

1. Open `http://localhost:3003/en/f/{familyId}/recipes/{recipeId}` (IDs from the API doc table).
2. **Photos and sources** section appears below the recipe header.
3. JPEG/WebP/PNG render in the photo grid (lazy-loaded).
4. PDF row shows **Download PDF**; clicking downloads the file (no embedded viewer).
5. Sign in as **viewer-a@family-cookbook.test** — same gallery visible (read access).
6. Optional: assign `media_asset_id` on a step in SQL for a `step_photo` asset and confirm the step shows an inline image.

## Negative checks

- Opening another family’s download URL route with a valid asset id from Family A returns **403** or **404** (not a URL).
- Pending/rejected assets do not appear in `assets` on detail and return **409 unavailable** from the download-url API.
