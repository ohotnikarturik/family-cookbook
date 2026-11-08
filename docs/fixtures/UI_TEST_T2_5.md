# T2.5 — Recipe editor UI test playbook

Local only. Use **http://localhost:3003** (not `127.0.0.1`) for auth cookies. See [LOCAL_SUPABASE.md](../LOCAL_SUPABASE.md) and [TEST_IDENTITIES.md](./TEST_IDENTITIES.md).

## Environment prep

1. `pnpm supabase:start`
2. `pnpm supabase:reset`
3. `pnpm supabase:sync-env`
4. `pnpm dev:web`
5. Mailpit: http://127.0.0.1:54324

## Deep links

| Target | URL |
| --- | --- |
| Family A dashboard | http://localhost:3003/en/f/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa |
| Family A recipes | …/recipes |
| **New recipe** | …/recipes/new |
| Edit buns | …/recipes/eeeeeeee-eeee-4eee-8eee-eeeeeeee0101/edit |
| Family B new | http://localhost:3003/en/f/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/recipes/new |
| B pancakes (Contributor B) | …/recipes/eeeeeeee-eeee-4eee-8eee-eeeeeeee0201/edit |
| B bread (Owner B) | …/recipes/eeeeeeee-eeee-4eee-8eee-eeeeeeee0202/edit |

## A. Navigation and CTAs

Sign in as **editor-a@family-cookbook.test**.

1. Dashboard → **Add recipe** beside **Browse all recipes**.
2. Recipes nav → **Add recipe** in list header.
3. Open **Grandma's cardamom buns** → **Edit recipe**.
4. As **viewer-a@family-cookbook.test** → no Add/Edit; `…/recipes/new` shows forbidden state.

## B. Create flow

As editor-a, **Add recipe**:

1. Single column at ~360px; basics, timing, meta, tags, ingredients, steps.
2. Fill title, language, optional fields; add/reorder ingredients and steps.
3. Add tag `weeknight` → **Save** → detail matches; list shows recipe.

## C. Validation preserve

Submit without title (other fields filled) → alert + title error; rows unchanged → fix → save.

## D. Edit permissions

| Persona | Check |
| --- | --- |
| editor-a | Edit any Family A recipe |
| contributor-b | Edit **Contributor's pancakes** only |
| contributor-b | `…/0202/edit` (Owner bread) → forbidden |

## E. Tags (contributor)

contributor-b: new tag name on own recipe → permission/save error, draft kept. owner-b: new tag succeeds.

## F. Version conflict

editor-a: two tabs on same edit → save tab A → save tab B without reload → conflict banner + reload link.

## G. Accessibility / responsive

320px, 360px, 200% zoom: keyboard through fields, reorder, submit; visible focus; `aria-busy` while saving.

## H. Locales and themes

`fi`, `ru`, `uk` on create/edit; light and dark readable.

## I. T2.4 regression

Smoke from [UI_TEST_T2_4.md](./UI_TEST_T2_4.md): search, filters, pagination, cross-tenant probe.

## Sign-off matrix

| Email | Must verify |
| --- | --- |
| `viewer-a@family-cookbook.test` | No CTAs; `/recipes/new` forbidden |
| `contributor-b@family-cookbook.test` | Create/edit own; not Owner B bread |
| `editor-a@family-cookbook.test` | Create, edit any, new tags |
| `owner-a@family-cookbook.test` | Dashboard Add recipe |
| `multi@family-cookbook.test` | Add/edit in A; viewer in B (no add) |

## Automated gate

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```
