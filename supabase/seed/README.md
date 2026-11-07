# Local database seed

[`../seed.sql`](../seed.sql) runs automatically after migrations on `pnpm supabase:reset`.

- **Scope:** `auth.users`, `auth.identities`, `public.profiles`, `public.families`, and `public.family_members`.
- Stable IDs: [`docs/fixtures/TEST_IDENTITIES.md`](../../docs/fixtures/TEST_IDENTITIES.md).

Credentials and UUIDs are documented in that fixtures file. Do not use these accounts or passwords outside local development.
