# Local test identities (development only)

Used by [`supabase/seed.sql`](../../supabase/seed.sql) after `pnpm supabase:reset`. **Never use in staging or production.**

| User ID | Email | Display name | Shared password | Future family (T1.2) | Intended role |
| --- | --- | --- | --- | --- | --- |
| `11111111-1111-4111-8111-111111111101` | `owner-a@family-cookbook.test` | Owner A | `LocalDev-Only-1` | Family A | `owner` |
| `11111111-1111-4111-8111-111111111102` | `editor-a@family-cookbook.test` | Editor A | `LocalDev-Only-1` | Family A | `editor` |
| `11111111-1111-4111-8111-111111111103` | `viewer-a@family-cookbook.test` | Viewer A | `LocalDev-Only-1` | Family A | `viewer` |
| `11111111-1111-4111-8111-111111111104` | `admin-a@family-cookbook.test` | Admin A | `LocalDev-Only-1` | Family A | `admin` |
| `22222222-2222-4222-8222-222222222201` | `owner-b@family-cookbook.test` | Owner B | `LocalDev-Only-1` | Family B | `owner` |
| `22222222-2222-4222-8222-222222222202` | `contributor-b@family-cookbook.test` | Contributor B | `LocalDev-Only-1` | Family B | `contributor` |
| `33333333-3333-4333-8333-333333333301` | `multi@family-cookbook.test` | Multi Family | `LocalDev-Only-1` | Family A + B | member of both |

## T1.2 (planned)

Reserve stable family UUIDs when adding tenant seed rows:

| Family | Planned `families.id` | Name |
| --- | --- | --- |
| A | `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa` | Andersen Test Kitchen |
| B | `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb` | Berg Test Pantry |

`family_members` rows will reference the user IDs above and these family IDs.
