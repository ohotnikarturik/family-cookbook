# Local database seed

[`../seed.sql`](../seed.sql) runs automatically after migrations on `pnpm supabase:reset`.

- **Scope (T1.1):** `auth.users`, `auth.identities`, and `public.profiles` only.
- **T1.2:** extend seed with `families` / `family_members` using stable IDs from [`docs/fixtures/TEST_IDENTITIES.md`](../../docs/fixtures/TEST_IDENTITIES.md).

Credentials and UUIDs are documented in that fixtures file. Do not use these accounts or passwords outside local development.
