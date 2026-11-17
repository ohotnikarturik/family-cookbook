# Local database seed

[`../seed.sql`](../seed.sql) runs automatically after migrations on `pnpm supabase:reset`.

- **Scope:** `auth.users`, `auth.identities`, `public.profiles`, `public.families`, and `public.family_members`.
- [`../seed-recipes.sql`](../seed-recipes.sql) runs next: tags, recipes, ingredients, steps and translations. Its header lists the invariants that pgTAP, integration and Playwright tests rely on.
- Dish pictures are not in SQL. After a reset run `pnpm supabase:seed-photos` (local only); see [`docs/LOCAL_SUPABASE.md`](../../docs/LOCAL_SUPABASE.md#seed-data).
- Stable IDs: [`docs/fixtures/TEST_IDENTITIES.md`](../../docs/fixtures/TEST_IDENTITIES.md).

Credentials and UUIDs are documented in that fixtures file. Do not use these accounts or passwords outside local development.
