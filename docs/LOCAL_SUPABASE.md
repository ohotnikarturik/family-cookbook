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
cp .env.example .env.local
pnpm supabase:start          # pulls images on first run
pnpm supabase:reset          # migrations + seed from empty DB
pnpm supabase:env            # print keys for .env.local
```

Copy from `pnpm supabase:env` into `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` (default `http://127.0.0.1:54321`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

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

Auth redirect allow-list includes `http://127.0.0.1:3003` and `http://localhost:3003` for the web app ([`NEXT_PUBLIC_APP_URL`](../.env.example)).

New `public` tables are not granted to the Data API automatically (`auto_expose_new_tables = false`). Each migration must `GRANT` the roles that should reach the table. Local Auth allows **100** emails per hour (`auth.rate_limit.email_sent`) so magic-link tests are not capped at the CLI default of 2. Restart the stack after changing `config.toml`.

## Seed data

Test users and profiles: [`docs/fixtures/TEST_IDENTITIES.md`](fixtures/TEST_IDENTITIES.md). Family rows arrive in **T1.2**.

## pgTAP

RLS tests will live under [`supabase/tests/`](../supabase/tests/) starting in T1.2.

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
