# pgTAP / RLS tests

Database policy tests (see `PROJECT_SPEC.md` §18.2). Run locally:

```bash
pnpm supabase:reset
pnpm supabase:test
```

Tests use `tests.request_as_user` and seeded UUIDs from [`docs/fixtures/TEST_IDENTITIES.md`](../../docs/fixtures/TEST_IDENTITIES.md).
