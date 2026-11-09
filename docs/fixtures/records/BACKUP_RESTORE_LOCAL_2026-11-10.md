# Backup / restore verification record

Local drill via `pnpm supabase:backup-restore-drill` after `pnpm supabase:reset`. Dump file stays in gitignored `var/backup-drill/` (not committed).

| Field | Value |
| --- | --- |
| **Environment** | `local` |
| **Date (UTC)** | 2026-11-10 |
| **Operator** | development (W35.16) |
| **Supabase project ref** | `family-cookbook` (local Docker) |
| **Backup source** | logical dump `var/backup-drill/local-drill.sql` (recipe aggregate tables only) |
| **Restore target** | Same local database |
| **Recipe / storage check** | pass — 33 recipes before wipe, 0 after `delete from recipes`, 33 after restore. Seed has no Storage objects. |
| **STAGING_SMOKE.md** | n/a (no hosted staging project) |
| **pgTAP (`pnpm supabase:test`)** | pass — 20 SQL files |
| **Issues / follow-ups** | Hosted staging restore still required before production. `audit_events` excluded from dump (not cascaded from recipes). `--disable-triggers` omitted (system RI triggers). |

## Sign-off

- [x] No service_role or backup URLs committed to git
- [x] Auth redirect URLs and `NEXT_PUBLIC_APP_URL` match the restored host (local `http://localhost:3003`)
- [ ] SMTP still sends invitation test ([`STAGING_INVITATION_EMAIL.md`](../STAGING_INVITATION_EMAIL.md)) when applicable
