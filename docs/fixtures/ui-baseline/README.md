# UI screenshot baseline (EPIC 3.8)

[`apps/web/e2e/screenshots.spec.ts`](../../../apps/web/e2e/screenshots.spec.ts) captures every main page so each EPIC 3.8 UI task can compare before and after. The images are not committed.

## How to run

```bash
pnpm supabase:reset && pnpm supabase:seed-photos   # clean seed with dish photos (local only)
pnpm dev:web                                        # http://localhost:3003 (reused by Playwright)
SCREENS_LABEL=before pnpm test:screens              # before your change
SCREENS_LABEL=after  pnpm test:screens              # after your change
```

- Output: `apps/web/screenshots/<label>/<viewport>-<theme>-<user>/<page>.jpg` plus `summary.json` per folder. The folder is gitignored.
- `SCREENS_LABEL` defaults to `current`. `SCREENS_LOCALE` defaults to `ru`; use `fi`, `uk` or `en` for a spot check.
- It runs only with `pnpm test:screens` (`PW_SCREENS=1`). CI and `pnpm test:e2e` never run it.
- A full run is 12 tests (2 viewports × 2 themes × signed out / owner / viewer) and takes a few minutes against `next dev`, because the dev server compiles each page on first visit.

## What to capture

- **Locale:** `ru`. It has the longest labels and uses Cyrillic. Spot-check `fi` and `uk` as well.
- **Viewports:** 360×740 (phone) and 1280×900 (desktop). Run 320px once per task to check reflow.
- **Themes:** light and dark. Set them with the browser `colorScheme`; the default theme preference is `system`.
- **Users:** `owner-a@family-cookbook.test` (all actions) and `viewer-a@family-cookbook.test` (read-only). See [`../TEST_IDENTITIES.md`](../TEST_IDENTITIES.md).
- **IDs:** family A is `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`. Recipe `…0101` has translations and no photo. Recipe `…0104` has a dish photo after `pnpm supabase:seed-photos`.

| Name | Path |
|---|---|
| landing | `/ru` (signed out) |
| signin | `/ru/auth/sign-in` (signed out) |
| home | `/ru/f/{A}` |
| recipes | `/ru/f/{A}/recipes` |
| detail | `/ru/f/{A}/recipes/{R}` (`…0101`) |
| detail-photo | `/ru/f/{A}/recipes/…0104` |
| edit | `/ru/f/{A}/recipes/{R}/edit` |
| new | `/ru/f/{A}/recipes/new` |
| history | `/ru/f/{A}/recipes/{R}/history` |
| translations | `/ru/f/{A}/recipes/{R}/translations` |
| settings | `/ru/f/{A}/settings` |
| members | `/ru/f/{A}/settings/members` |
| invitations | `/ru/f/{A}/settings/invitations` |
| families | `/ru/families` |
| account | `/ru/account` |
| account-menu | `/ru/f/{A}/recipes` with the account menu open (viewport only) |

For each page, `summary.json` records:

- `landed`: the path after redirects (for example, a viewer opening `edit`).
- `h1`: number of `<h1>` elements.
- `navCurrent`: the visible text of each `nav [aria-current="page"]` link that is rendered (desktop pills, mobile bottom bar, settings chips).
- `overflowX`: `true` when the page is wider than the viewport, which means sideways scrolling.

**Target after P0:** on every signed-in page, exactly one `h1`, exactly one highlighted primary-nav item (none only on account pages), and `overflowX: false`.

## Baseline measured on `main` (2026-11-17, first `test:screens` run after W38.0)

| Page | h1 | Highlighted nav | Overflow at 360px |
|---|---|---|---|
| home | 0 | none | no |
| recipes, detail, detail-photo, edit, new, history, translations | 0 | Recipes | no |
| settings, members, invitations | 0 | Family + sub-nav chip | **yes** (sub-nav chip row) |
| families, account, prefs, landing, sign-in | 1 | n/a (no shell) | no |

`prefs` (`/ru/account/preferences`) was in the 2026-11-17 baseline; W38.2b merged it into `account` and the old address redirects, so it is no longer captured.

Viewer: `translations` and `invitations` render the full-page "not available" screen (one `h1`, no family navigation), and `edit`/`new` stay inside the shell. W38.2 and W38.8 make the no-access states consistent.
