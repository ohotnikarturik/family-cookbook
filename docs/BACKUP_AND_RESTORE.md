# Backup and restore (W35.16)

Family Cookbook stores tenant data in **Postgres** (Supabase) and **private Storage** objects. Operators must be able to recover from accidental deletion, provider outage, or bad migration.

## Hosted Supabase (staging / production)

### Backup schedule (platform)

Configure in the [Supabase Dashboard](https://supabase.com/dashboard) per project:

| Capability | Typical use |
| --- | --- |
| **Daily backups** | Included on paid plans; retention depends on plan tier. Enable for **each** hosted project (staging and production separately). |
| **Point-in-time recovery (PITR)** | Optional add-on; recommended for production when RPO must be under 24 hours. |
| **Manual backup before risky change** | Take a logical dump or use Dashboard backup before major migrations or data fixes. |

Document the chosen tier and retention in your internal runbook. This repo does not create Supabase projects.

### Database restore (hosted)

1. Identify the target project (staging first; never test an unfamiliar restore on production).
2. **Dashboard → Database → Backups** — restore to a **new** project or follow Supabase’s current restore workflow for your plan.
3. Reconcile **Auth redirect URLs**, **Storage** buckets, and **SMTP** with [`DEPLOYMENT.md`](DEPLOYMENT.md) after restore.
4. Run [`fixtures/STAGING_SMOKE.md`](fixtures/STAGING_SMOKE.md) on the restored environment.
5. Record the drill in [`fixtures/records/BACKUP_RESTORE_RECORD_TEMPLATE.md`](fixtures/records/BACKUP_RESTORE_RECORD_TEMPLATE.md).

Do not paste `service_role` keys or backup download URLs into tickets or git.

### Storage (recipe media)

Private objects live in Supabase Storage. Database restore **does not** automatically restore bucket files unless the provider’s backup scope includes Storage.

- Treat uploaded recipe assets as **co-dependent** with `recipe_assets` rows.
- For production readiness: confirm your Supabase plan’s backup scope includes Storage, or schedule periodic export of the private bucket to isolated object storage (operator-owned procedure).

## Local development (prove the drill)

Developers can run an automated **logical dump → destructive change → restore → pgTAP** loop against the Docker Postgres container:

```bash
pnpm supabase:start
pnpm supabase:reset    # known baseline with seed
pnpm supabase:backup-restore-drill
```

The script writes dumps under `var/backup-drill/` (gitignored). It:

1. Counts rows in `public.recipes` (including archived).
2. `pg_dump` of **recipe aggregate tables only** (`--data-only --inserts`) via `docker exec`. Does **not** dump `audit_events` (those rows are not deleted with recipes). `recipe_assets` is listed before `recipe_steps` so step photos can restore. (`--disable-triggers` is not used: Supabase Postgres rejects disabling system RI triggers.)
3. Deletes all rows from `recipes` (simulated disaster; children CASCADE).
4. Restores the dump with `psql`.
5. Verifies the recipe count matches the baseline.
6. Runs `pnpm supabase:test` (pgTAP) to confirm RLS and schema integrity.

See the latest successful run record: [`fixtures/records/BACKUP_RESTORE_LOCAL_2026-11-10.md`](fixtures/records/BACKUP_RESTORE_LOCAL_2026-11-10.md).

## When to run verification

| When | Action |
| --- | --- |
| Before calling production “ready” | At least one **hosted staging** restore drill recorded. |
| After enabling PITR or changing backup tier | Re-run staging restore smoke. |
| Quarterly (recommended) | Repeat staging restore + smoke. |
| Locally | Any time you change migrations/RLS heavily — run `pnpm supabase:backup-restore-drill`. |

## Out of scope

- Automated backup to third-party clouds from application code.
- Family export / owner purge (post-MVP per `PROJECT_SPEC.md` §16).
