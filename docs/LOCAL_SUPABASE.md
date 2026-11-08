# Local Supabase

Reproducible Postgres, Auth, and Studio for development. Canonical config: [`supabase/config.toml`](../supabase/config.toml).

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (Desktop or compatible engine)
- Supabase CLI **3.x** — installed via repo devDependency (`pnpm install`) or globally (`brew install supabase/tap/supabase`)
- **Recommended clone path:** `~/Developer/...` or `~/projects/...` — not `~/Desktop/...` on macOS (see [Studio on macOS](#studio-on-macos))

Verified with **Supabase CLI 3.0.0**.

## First-time setup

```bash
pnpm install
pnpm supabase:start          # pulls images on first run
pnpm supabase:reset          # migrations + seed from empty DB
pnpm supabase:sync-env       # writes NEXT_PUBLIC_* into apps/web/.env.local
```

`pnpm supabase:sync-env` maps local Supabase **`API_URL`** / **`ANON_KEY`** into:

- `NEXT_PUBLIC_SUPABASE_URL` (often `http://127.0.0.1:54321`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Next.js loads **`apps/web/.env.local`** (the app’s working directory). After sync, restart **`pnpm dev:web`** if it was already running.

Raw CLI output (different variable names): `pnpm supabase:env`

Set `SUPABASE_PROJECT_ID=family-cookbook` to match `project_id` in `config.toml` (documentation only for now).

Do **not** commit `service_role` keys. For rare local admin tasks, read `SUPABASE_SERVICE_ROLE_KEY` from `supabase status` and keep it only in `.env.local`.

## Daily commands

| Command | Purpose |
| --- | --- |
| `pnpm supabase:start` | Start stack (retries without Studio if Studio mount fails) |
| `pnpm supabase:start:full` | Start everything including Studio; fails if Studio cannot mount |
| `pnpm supabase:start:core` | Start without Studio (`-x studio`) |
| `pnpm supabase:query -- "<sql>"` | Run SQL against local DB (no Studio needed) |
| `pnpm supabase:stop` | Stop containers |
| `pnpm supabase:status` | URLs, ports, health |
| `pnpm supabase:reset` | Drop DB, re-run migrations + [`seed.sql`](../supabase/seed.sql) |
| `pnpm supabase:migrate` | Apply pending migrations without full reset |

**Canonical clean slate:** `pnpm supabase:reset` (not `supabase:migrate` alone).

## Local URLs (defaults)

| Service | URL |
| --- | --- |
| API | http://127.0.0.1:54321 |
| Studio | http://127.0.0.1:54323 |
| Mail (Inbucket / local SMTP UI) | http://127.0.0.1:54324 |

Auth `site_url` is `http://localhost:3003` (same as [`NEXT_PUBLIC_APP_URL`](../.env.example)). The redirect allow-list also includes `http://127.0.0.1:3003`.

New `public` tables are not granted to the Data API automatically (`auto_expose_new_tables = false`). Each migration must `GRANT` the roles that should reach the table. Local Auth allows **100** emails per hour (`auth.rate_limit.email_sent`) so magic-link tests are not capped at the CLI default of 2. Restart the stack after changing `config.toml`.

## Seed data

Test users, profiles, families, and memberships: [`docs/fixtures/TEST_IDENTITIES.md`](fixtures/TEST_IDENTITIES.md).

## Auth (T1.3)

1. Run `pnpm supabase:sync-env` (after `pnpm supabase:start`); it sets `NEXT_PUBLIC_APP_URL=http://localhost:3003`, which matches [`config.toml`](../supabase/config.toml) `site_url`.
2. Start web: `pnpm dev:web` → open `http://localhost:3003/en/auth/sign-in`. `http://127.0.0.1:3003` also works. Request the link and open it in the **same host** — the PKCE cookie is not shared between `localhost` and `127.0.0.1`.
3. Enter an email; open **Mailpit** at http://127.0.0.1:54324 and **click the sign-in link** in the message (HTML or Text tab).
4. Callback is **`/auth/callback`** (not locale-prefixed). After sign-in, `/en/account` should show your session; **Sign out** clears the cookie session. The account page creates a `profiles` row if the callback did not.

New sign-ups create `auth.users` + `profiles` on first successful login. Seeded personas in [`fixtures/TEST_IDENTITIES.md`](fixtures/TEST_IDENTITIES.md) can sign in with their `.test` emails via Mailpit (not password UI in MVP).

### Magic link vs email code (local)

The web app calls `signInWithOtp` with a redirect to the Next.js callback (`@supabase/ssr` / PKCE cookie session). **Locally, Auth emails are link-only:** subject *Your sign-in link*, body with a URL like `http://127.0.0.1:54321/auth/v1/verify?token=pkce_…`. There is **no 6-digit code** in Mailpit (HTML, Text, or Raw) unless you customize GoTrue email templates (e.g. add `{{ .Token }}`).

| Path | Local dev |
| --- | --- |
| **Magic link** (recommended) | Click **Sign in** in Mailpit → browser hits Auth verify → redirects to `/auth/callback` |
| **“Verify code” on sign-in** | Needs a **6-digit** OTP in the email (`auth.email.otp_length`); **not available** with default local templates. The code field rejects anything else |

The sign-in page shows **both** forms for parity with hosted Supabase (some projects include OTP in email). For day-to-day local work, ignore the code section and use the link only. The long `pkce_…` token in the URL is **not** what the code field expects.

## Families (T1.4)

After sign-in, the app sends you to **`/{locale}/onboarding`** when you have no memberships, otherwise to **`/{locale}/f/{familyId}`** (preferred family from `profiles.last_selected_family_id` when still a member, else the first membership).

| Goal | Steps |
| --- | --- |
| **Create a family** | Sign in → onboarding form (name + default recipe language) → lands on the new dashboard as **owner** |
| **List families** | `/{locale}/families` (e.g. `multi@family-cookbook.test` after Mailpit sign-in) |
| **Switch family** | Use **Active family** on a family dashboard, or open another family from the list |
| **Multi-family seed** | `multi@family-cookbook.test` — **editor** in Family A, **viewer** in Family B ([`TEST_IDENTITIES.md`](fixtures/TEST_IDENTITIES.md)) |

Family URLs use an explicit UUID segment (`/en/f/aaaaaaaa-…`). Opening another family’s id without membership returns **404** (RLS + layout guard).

## Recipe media uploads (T3.1)

After `pnpm supabase:reset`, migration **`20251108100000_recipe_assets_and_storage.sql`** creates the private bucket **`family-recipe-media`** and `recipe_assets` RLS. Upload: [`fixtures/API_TEST_T3_1.md`](fixtures/API_TEST_T3_1.md). Gallery on recipe detail: [`fixtures/UI_TEST_T3_2.md`](fixtures/UI_TEST_T3_2.md).

## Invitations (T1.5)

**SMTP (invite emails):** Local stack exposes Mailpit SMTP on **`127.0.0.1:54325`** (`smtp_port` in [`supabase/config.toml`](../supabase/config.toml)). After enabling or changing SMTP, restart the stack (`pnpm supabase:stop` → `pnpm supabase:start`). Run **`pnpm supabase:sync-env`** so [`apps/web/.env.local`](../apps/web/.env.local) gets `INVITATION_SMTP_*` defaults.

| Goal | Steps |
| --- | --- |
| **Send invite** | Sign in as **owner/admin** (e.g. `owner-a@family-cookbook.test`) → family dashboard → **Invitations** → email + role → **Send invitation** |
| **Read invite mail** | Mailpit UI http://127.0.0.1:54324 — subject/body includes link to `/{locale}/invite/accept?token=…` |
| **Accept** | Open link (or paste token on accept page) → sign in **as the same email** → **Accept invitation** → dashboard for that family |
| **Revoke** | **Invitations** settings → **Revoke** on a pending row |
| **Send again** | If the email is not sent, the pending row is withdrawn. Send the same address again. An expired pending invite is replaced the same way. |

Magic-link sign-in still uses Auth → Mailpit (port 54324). Invite delivery uses SMTP (54325); both land in the same Mailpit inbox locally. The accept page can sign out and return to the same link when the signed-in email is not the invited one.

## pgTAP

RLS tests live under [`supabase/tests/`](../supabase/tests/). After a reset:

```bash
pnpm supabase:reset   # stack must be running
pnpm supabase:test    # uses docker exec when CLI pg_prove mount fails (macOS Desktop paths)
```

## Studio on macOS

Studio mounts [`supabase/snippets/`](../supabase/snippets/) into a Docker container. If macOS blocks Docker from reading the repo (often when the path is under **`~/Desktop`**), `pnpm supabase:start:full` fails with:

`operation not permitted` / `supabase/snippets`

**`pnpm supabase:start` (default)** detects that case, starts **Postgres + Auth + API + Mailpit without Studio**, and prints this section. The team can develop and run resets normally.

To get **Studio** (http://127.0.0.1:54323) on your machine, use one of these (in order):

1. **Move or clone the repo off Desktop**, e.g. `~/Developer/family-cookbook`, then `pnpm supabase:stop` and `pnpm supabase:start:full`.
2. **macOS Privacy:** System Settings → **Privacy & Security** → **Files and Folders** → **Docker** → enable **Desktop** (and **Documents** if needed). Restart Docker Desktop.
3. If it still fails: **Full Disk Access** for Docker Desktop (same Privacy pane). Restart Docker.
4. **Docker Desktop** → Settings → **Resources** → **Virtual file shares** — ensure `/Users` or the repo parent path is listed. Apply & restart Docker.

Then:

```bash
pnpm supabase:stop
pnpm supabase:start:full
pnpm supabase:status    # Studio URL should appear (not under "Stopped services")
```

Linux and Windows developers usually run `pnpm supabase:start:full` or default `pnpm supabase:start` and get Studio without extra steps.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| `pnpm supabase:status` → no `supabase_db_...` container | Run `pnpm supabase:start`; avoid leaving the stack in a half-failed state from a raw `supabase start` after Studio died |
| Need data without Studio | `pnpm supabase:query -- "select email from auth.users order by email"` |
| Clean database | `pnpm supabase:reset` (stack must be running) |
