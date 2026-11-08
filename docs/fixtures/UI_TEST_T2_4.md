# T2.4 — Recipe browsing UI test playbook

Local only. Use **http://localhost:3003** (not `127.0.0.1`) for auth cookies. See [LOCAL_SUPABASE.md](../LOCAL_SUPABASE.md) and [TEST_IDENTITIES.md](./TEST_IDENTITIES.md).

## Environment prep

1. `pnpm supabase:start`
2. `pnpm supabase:reset`
3. `pnpm supabase:sync-env`
4. `pnpm dev:web`
5. Mailpit: http://127.0.0.1:54324

## Sign-in (each persona)

1. Sign out or use a private window.
2. http://localhost:3003/en/auth/sign-in
3. Enter persona email → open magic link in Mailpit.

## Deep links

| Target | URL |
| --- | --- |
| Family A dashboard | http://localhost:3003/en/f/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa |
| Family A recipes | http://localhost:3003/en/f/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/recipes |
| Family B dashboard | http://localhost:3003/en/f/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb |
| Family B recipes | http://localhost:3003/en/f/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/recipes |
| Detail (A buns) | …/recipes/eeeeeeee-eeee-4eee-8eee-eeeeeeee0101 |
| Detail (B pancakes) | …/recipes/eeeeeeee-eeee-4eee-8eee-eeeeeeee0201 |
| Cross-tenant probe | http://localhost:3003/en/f/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/recipes/eeeeeeee-eeee-4eee-8eee-eeeeeeee0201 |

## Shared journey

1. Dashboard → recent list + **Browse all recipes**.
2. Nav **Recipes** — list at ~360px width.
3. Only this family’s titles.
4. Open **Grandma's cardamom buns** — ingredients + steps.
5. Back to list.
6. Filter `query=salmon`, `category=Baking`, `tag=fish`, sort, **Include archived**.
7. Pagination when >25 active recipes.
8. Light/dark theme; locales `fi`, `ru`, `uk`.

## Per email

| Email | Checks |
| --- | --- |
| `owner-a@family-cookbook.test` | Full Family A; invitations link; Family B URL → 404 |
| `editor-a@family-cookbook.test` | Family A browse; no invitations link |
| `viewer-a@family-cookbook.test` | Read-only list + detail |
| `admin-a@family-cookbook.test` | Family A + invitations link |
| `owner-b@family-cookbook.test` | Family B only; not Family A titles |
| `contributor-b@family-cookbook.test` | Family B browse |
| `multi@family-cookbook.test` | Switch A ↔ B; cross-tenant probe → forbidden/not found |

## Sign-off

- All seven emails
- Cross-tenant probes
- Archived filter + pagination
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`
