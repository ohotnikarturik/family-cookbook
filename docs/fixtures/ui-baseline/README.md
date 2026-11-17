# UI screenshot baseline (EPIC 3.8)

This is a reference for **W38.0**, which turns it into `apps/web/e2e/screenshots.spec.ts`. Every later EPIC 3.8 UI task re-runs that spec and compares the images before and after its change. The images are not committed; they go to a gitignored folder.

## What to capture

- **Locale:** `ru`. It has the longest labels and uses Cyrillic. Spot-check `fi` and `uk` as well.
- **Viewports:** 360×740 (phone) and 1280×900 (desktop). Run 320px once per task to check reflow.
- **Themes:** light and dark. Set them with the browser `colorScheme`; the default theme preference is `system`.
- **Users:** `owner-a@family-cookbook.test` (all actions) and `viewer-a@family-cookbook.test` (read-only). See [`../TEST_IDENTITIES.md`](../TEST_IDENTITIES.md).
- **IDs:** family A is `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`. The recipe `eeeeeeee-eeee-4eee-8eee-eeeeeeee0101` has translations.

| Name | Path |
|---|---|
| landing | `/ru` (signed out) |
| signin | `/ru/auth/sign-in` (signed out) |
| home | `/ru/f/{A}` |
| recipes | `/ru/f/{A}/recipes` |
| detail | `/ru/f/{A}/recipes/{R}` |
| edit | `/ru/f/{A}/recipes/{R}/edit` |
| new | `/ru/f/{A}/recipes/new` |
| history | `/ru/f/{A}/recipes/{R}/history` |
| translations | `/ru/f/{A}/recipes/{R}/translations` |
| settings | `/ru/f/{A}/settings` |
| members | `/ru/f/{A}/settings/members` |
| invitations | `/ru/f/{A}/settings/invitations` |
| families | `/ru/families` |
| account | `/ru/account` |
| prefs | `/ru/account/preferences` (redirects after W38.2) |
| accountmenu | `/ru/f/{A}/recipes` with the account menu open |

For each page, also record these values in a JSON summary:

```js
{
  h1: document.querySelectorAll('h1').length,
  navCurrent: [...document.querySelectorAll('nav [aria-current="page"]')]
    .filter((e) => e.offsetParent !== null)
    .map((e) => e.textContent.trim()),
  overflowX: document.documentElement.scrollWidth > window.innerWidth,
}
```

**Target after P0:** on every signed-in page, exactly one `h1`, exactly one highlighted primary-nav item (none only on account pages), and `overflowX: false`.

## Baseline measured on `main` (2026-11-16)

| Page | h1 | Highlighted nav | Overflow at 360px |
|---|---|---|---|
| home | 0 | none | no |
| recipes, detail, edit, new, history, translations | 0 | Recipes | no |
| settings, members, invitations | 0 | Family + sub-nav chip | **members: yes** |
| families, account, prefs, landing, sign-in | 1 | n/a (no shell) | no |

## How to implement the spec

- Sign in with the existing [`loginAs`](../../../apps/web/e2e/fixtures/auth.ts) fixture, which seeds cookies with a local password sign-in. Do not use the UI or Mailpit for this.
- Use `page.goto(url, { waitUntil: 'networkidle' })`, wait about 700 ms for client components, then call `page.screenshot({ fullPage: true, type: 'jpeg', quality: 60 })`.
- Keep the spec out of CI and out of the default `pnpm test:e2e` run. Give it its own Playwright project or a `@screens` tag with `grepInvert`, and add a script for it: `pnpm --filter @family-cookbook/web test:screens`.
- Write the output to `apps/web/test-results/screens/<viewport>-<theme>-<user>/<name>.jpg` plus a `summary.json`. `apps/web/.gitignore` already ignores `test-results`.
- The Next.js dev indicator (the floating "N" button) appears in screenshots. Ignore it, or set `devIndicators: false` only for this run.
