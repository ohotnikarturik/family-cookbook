# Backup / restore verification record (template)

Copy this file per drill; store completed records in `docs/fixtures/records/` (no secrets).

| Field | Value |
| --- | --- |
| **Environment** | `local` \| `staging` \| `production` |
| **Date (UTC)** | YYYY-MM-DD |
| **Operator** | name or role |
| **Supabase project ref** | e.g. `abcdefghijklmnop` or `family-cookbook` (local) |
| **Backup source** | Daily backup / PITR timestamp / logical dump file name |
| **Restore target** | Same project \| new staging project |
| **Recipe / storage check** | pass \| fail — notes |
| **STAGING_SMOKE.md** | pass \| fail \| n/a |
| **pgTAP (`pnpm supabase:test`)** | pass \| fail \| n/a |
| **Issues / follow-ups** | |

## Sign-off

- [ ] No service_role or backup URLs committed to git
- [ ] Auth redirect URLs and `NEXT_PUBLIC_APP_URL` match the restored host
- [ ] SMTP still sends invitation test ([`STAGING_INVITATION_EMAIL.md`](../STAGING_INVITATION_EMAIL.md)) when applicable
