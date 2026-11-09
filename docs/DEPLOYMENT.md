# Staging and production deployment (W35.15)

This is the operator guide for **isolated** hosted environments. It does not create cloud projects, spend money, or store secrets. Fill in values on the host; never commit them.

**Local development** stays in [`LOCAL_SUPABASE.md`](LOCAL_SUPABASE.md). **MCP** (`apps/mcp`) is a `/health` placeholder — do not deploy it until EPIC 4.

## Isolation rules

| Environment | Supabase | App URL | Seed data | SMTP |
| --- | --- | --- | --- | --- |
| Local | Docker CLI project `family-cookbook` | `http://localhost:3003` | [`fixtures/TEST_IDENTITIES.md`](fixtures/TEST_IDENTITIES.md) | Mailpit `127.0.0.1:54325` |
| Staging | **Dedicated** hosted project | HTTPS staging origin | **No** local seed | Real relay ([`STAGING_INVITATION_EMAIL.md`](fixtures/STAGING_INVITATION_EMAIL.md)) |
| Production | **Second** hosted project | HTTPS production origin | **No** local seed | Real relay (separate credentials) |

- Never reuse local anon/service keys, Mailpit, or `.test` personas on a hosted project.
- Never put `SUPABASE_SERVICE_ROLE_KEY` on the web host. The app uses the **anon** key and RLS only.
- Staging and production must not share a database, storage bucket, JWT secret, or SMTP password.
- Production deploy, paid services, and real credentials need **explicit operator approval** ([`AGENTS.md`](../AGENTS.md)).

## Environment variables

Canonical placeholders: [`.env.example`](../.env.example). Set the same names in the host’s secret manager.

| Variable | Web | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | required | Hosted project URL (`https://<ref>.supabase.co`). **Inlined at Next.js build time.** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | required | Project **anon** (publishable) key only. Inlined at build time. |
| `NEXT_PUBLIC_APP_URL` | required | Canonical HTTPS origin, no trailing slash (e.g. `https://staging.example.com`). Used for PKCE callbacks, CSP, CORS, invitation links. |
| `INVITATION_SMTP_HOST` | required (hosted) | Remote hostname. Loopback is rejected when `NODE_ENV=production`. |
| `INVITATION_SMTP_PORT` | required (hosted) | Typically `587` (STARTTLS) or `465` (TLS). |
| `INVITATION_SMTP_FROM` | required (hosted) | Verified sender; not `*@family-cookbook.test`. |
| `INVITATION_SMTP_USER` | required (hosted) | Provider username. |
| `INVITATION_SMTP_PASSWORD` | required (hosted) | Provider secret. Never log. |
| `NEXT_PUBLIC_ENABLE_DESIGN_GALLERY` | optional | `true` on staging only. Omit in production. |
| `NODE_ENV` | set by `next start` / host | Must be `production` on hosted web (Secure cookies, HSTS, SMTP guards). |

`NEXT_PUBLIC_*` values must be present at **`pnpm build`**, not only at runtime. A rebuild is required after changing them.

## Hosted Supabase

Create **two** projects in the [Supabase dashboard](https://supabase.com/dashboard) (staging, then production). Do not copy local `config.toml` `project_id` as a cloud ref.

### Auth

In **Authentication → URL configuration** for that project:

- **Site URL:** the same value as `NEXT_PUBLIC_APP_URL`.
- **Redirect URLs** (exact, HTTPS):
  - `{NEXT_PUBLIC_APP_URL}/auth/callback`
  - `{NEXT_PUBLIC_APP_URL}/**`
- Confirm email / magic-link templates stay on the hosted Auth service (not Mailpit).
- Invitation accept still requires a **verified** email matching the invite (unchanged from T1.5).

### Database and storage

Migrations live in [`supabase/migrations/`](../supabase/migrations/). Apply them to an **empty** hosted database (never `seed.sql` / `seed-recipes.sql`).

From a machine that has the CLI and is logged in (`supabase login`):

```bash
# Staging example — use the dashboard project ref the operator created.
pnpm exec supabase link --project-ref <STAGING_PROJECT_REF>
pnpm exec supabase db push
```

Repeat against the production ref only after staging smoke passes. Do not edit already-applied migration files; add a new one.

The private bucket `family-recipe-media` is created by migration `20251108100000_recipe_assets_and_storage.sql`. Confirm it exists and is **private** after push.

`tests.request_as_user` exists for local pgTAP. It is not a product API.

### Linking checklist (each project)

1. Copy **Project URL** and **anon** key into the web host env (not the service_role key).
2. Set Auth Site URL + redirects as above.
3. `db push` migrations.
4. Confirm RLS is enabled (pgTAP already covers this locally; do not disable RLS to “make staging work”).

## Web application

The web app is Next.js **16** in `apps/web`, built from the **monorepo root**.

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm --filter @family-cookbook/web start
```

`next start` in this repo listens on **port 3003** unless the host overrides the start command. A managed Next.js host should:

- Build from the **repository root** (workspace packages must compile before the app).
- Install with **pnpm 12.16.1** (`packageManager` in root `package.json`) and Node **22**.
- Inject the env table **before** `pnpm build`.
- Serve over **HTTPS**.
- Not expose `.env.local`, service_role, or SMTP passwords in build logs.

Application code does not depend on a specific vendor. Use any host that can run that build and keep secrets out of git.

## Staging smoke

Repeatable checklist: [`fixtures/STAGING_SMOKE.md`](fixtures/STAGING_SMOKE.md). Invitation email: [`fixtures/STAGING_INVITATION_EMAIL.md`](fixtures/STAGING_INVITATION_EMAIL.md).

## What this task does not do

- Create cloud accounts, DNS, or paid SMTP.
- Deploy from CI (no production deploy workflow yet).
- Back up or restore hosted databases — [`TASKS.md`](../TASKS.md) **W35.16**.
- Ship MCP or OAuth 2.1 — **EPIC 4**.
