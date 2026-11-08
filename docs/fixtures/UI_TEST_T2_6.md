# T2.6 — Recipe history and audit UI test playbook

Local only. Use **http://localhost:3003** (not `127.0.0.1`) for auth cookies. See [LOCAL_SUPABASE.md](../LOCAL_SUPABASE.md) and [TEST_IDENTITIES.md](./TEST_IDENTITIES.md).

## Environment prep

1. `pnpm supabase:start`
2. `pnpm supabase:reset`
3. `pnpm supabase:sync-env`
4. `pnpm dev:web`

## Deep links

| Target | URL |
| --- | --- |
| Family A buns detail | http://localhost:3003/en/f/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/recipes/eeeeeeee-eeee-4eee-8eee-eeeeeeee0101 |
| Buns history | …/history |
| B pancakes (Contributor B) | http://localhost:3003/en/f/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/recipes/eeeeeeee-eeee-4eee-8eee-eeeeeeee0201/history |

## A. Entry and roles

1. Sign in as **editor-a@family-cookbook.test** → open **Grandma's cardamom buns** → **View history** appears beside **Edit recipe**.
2. History page shows **Revisions** (version numbers, timestamps) and **Security log** (created/updated events, no recipe body text).
3. Sign in as **viewer-a@family-cookbook.test** → buns detail has **no** View history; direct `…/history` shows forbidden state.
4. Sign in as **contributor-a@family-cookbook.test** on a recipe they created → View history works; **no** Security log section (editor-and-above only).
5. Sign in as **contributor-b@family-cookbook.test** → Family A buns history URL forbidden; own Family B pancake history allowed without audit block.

## B. After edits

1. As editor-a, edit buns (change title or ingredient) → save → history lists new version; audit shows **Recipe updated** with higher version number.
2. Archive a recipe → history and audit reflect archive event (if status change writes revision per RPC rules).

## C. Pagination (optional)

1. If more than 25 revisions exist, **Next page** under revisions uses `?cursor=` and **First page** clears only that param.
2. If more than 25 security-log rows exist, **Next page** under the log uses `?auditCursor=` and leaves the revision page in place.

## D. Localization

1. Open history under `/ru/…/history` → Russian strings for headings and event labels.
