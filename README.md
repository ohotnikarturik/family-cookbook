# Family Cookbook

Private, multi-tenant family recipe library — mobile-first web app and remote MCP service.

## Specification

- [`PROJECT_SPEC.md`](PROJECT_SPEC.md) — product, architecture, security, MCP, testing, release
- [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) — visual direction and tokens
- [`AGENTS.md`](AGENTS.md) — AI agent working rules
- [`TASKS.md`](TASKS.md) — ordered implementation backlog
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — recorded technical decisions

## Monorepo layout

| Path | Purpose |
|------|---------|
| `apps/web` | Next.js App Router UI |
| `apps/mcp` | Hono MCP placeholder (`GET /health`) |
| `packages/contracts` | Shared Zod schemas / DTOs |
| `packages/domain` | Pure domain types and rules |
| `packages/permissions` | Role capability checks |
| `packages/application` | Use cases shared by web and MCP |
| `packages/data-access` | Supabase repositories (T1+) |
| `packages/config` | Shared ESLint, TypeScript, Vitest config |

## Prerequisites

- Node.js **≥ 20.9** (22 recommended; see `.nvmrc`)
- pnpm **12.16.1** (Corepack: `corepack enable`)
- **Local database (optional until T1.3):** [Docker](https://docs.docker.com/get-docker/) and Supabase CLI via `pnpm install` (see [Local Supabase](docs/LOCAL_SUPABASE.md))

## Setup

```bash
cp .env.example .env.local   # placeholders only; configure in later tasks
pnpm install
```

Dependency install scripts that need explicit approval are listed under `allowBuilds` in [`pnpm-workspace.yaml`](pnpm-workspace.yaml) (`esbuild`, `sharp`, `unrs-resolver`). If install reports `ERR_PNPM_IGNORED_BUILDS` for another package, review that script before adding it.

## Continuous integration

GitHub Actions workflow **[CI](.github/workflows/ci.yml)** runs on every push to `main` and on pull requests:

- **Quality:** `pnpm format:check`, `lint`, `typecheck`, `test`, `build`, then `verify:client-bundle` (heuristic scan of `apps/web/.next` static assets)
- **Security:** Gitleaks (with [`.gitleaks.toml`](.gitleaks.toml)) and `pnpm audit --audit-level high`
- **pgTAP / RLS:** Postgres-only Supabase start, `supabase:reset`, `supabase:test` (see [Local Supabase](docs/LOCAL_SUPABASE.md#pgtap))
- **Playwright E2E:** Supabase core stack, reset, build, critical journeys (`ubuntu-24.04` runner)

**Web MVP gate (EPIC 3.5):** complete per [`PROJECT_SPEC.md`](PROJECT_SPEC.md) §19.1 and [`TASKS.md`](TASKS.md) W35.12. MCP and staging release criteria are §19.2–§19.3.

Local parity before pushing:

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm verify:client-bundle && pnpm audit --audit-level high
```

With Docker: `pnpm supabase:db:start && pnpm supabase:reset && pnpm supabase:test`. E2E: start Supabase, `pnpm supabase:sync-env`, `pnpm build`, `pnpm test:e2e` (see [`docs/LOCAL_SUPABASE.md`](docs/LOCAL_SUPABASE.md)).

## Commands (repository root)

```bash
pnpm dev:web          # Next.js dev server; UI at http://localhost:3003/en (locale prefix)
pnpm dev:mcp          # MCP placeholder (default http://localhost:8787)
pnpm build            # Build all packages, then apps
pnpm typecheck        # TypeScript across workspace; web runs `next typegen` first
pnpm lint             # ESLint across workspace
pnpm test             # Build libraries, then Vitest smoke tests
pnpm format:check     # Prettier check
pnpm format           # Prettier write
pnpm verify:client-bundle   # After build: scan web client bundles for secret-like patterns
```

## Staging and production

Operator guide (isolated Supabase projects, secrets, web build, smoke checklist): [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Repeatable staging smoke: [`docs/fixtures/STAGING_SMOKE.md`](docs/fixtures/STAGING_SMOKE.md). Invitation SMTP: [`docs/fixtures/STAGING_INVITATION_EMAIL.md`](docs/fixtures/STAGING_INVITATION_EMAIL.md). Backup/restore: [`docs/BACKUP_AND_RESTORE.md`](docs/BACKUP_AND_RESTORE.md).

Do not deploy MCP until EPIC 4. Do not use local seed identities or `service_role` on hosted web.

## Local Supabase

Full steps: [`docs/LOCAL_SUPABASE.md`](docs/LOCAL_SUPABASE.md).

```bash
pnpm supabase:start       # start stack (falls back without Studio if the mount fails)
pnpm supabase:start:full  # require Studio
pnpm supabase:stop
pnpm supabase:status
pnpm supabase:reset       # migrations + seed from an empty database
pnpm supabase:migrate     # pending migrations only; prefer reset for a clean slate
pnpm supabase:sync-env    # write NEXT_PUBLIC_SUPABASE_* to apps/web/.env.local
pnpm supabase:query -- "select display_name from public.profiles"
```

On **macOS**, avoid cloning under **`~/Desktop`** if you want Studio — see [`docs/LOCAL_SUPABASE.md`](docs/LOCAL_SUPABASE.md#studio-on-macos).

Test sign-in accounts (local only): [`docs/fixtures/TEST_IDENTITIES.md`](docs/fixtures/TEST_IDENTITIES.md). **Magic link / OTP:** [`docs/LOCAL_SUPABASE.md`](docs/LOCAL_SUPABASE.md#auth-t13) (Mailpit at port 54324).

## Design gallery (development)

With **`pnpm dev:web`**, open [http://localhost:3003/en/design](http://localhost:3003/en/design) (replace `en` with `fi`, `ru`, or `uk`) to preview tokens, light/dark/system theme (cookie `fc-theme`), and component stubs. The localized home page includes a footer link to the gallery only when not running a production build.

To expose `/{locale}/design` in a **production** or staging build, set **`NEXT_PUBLIC_ENABLE_DESIGN_GALLERY=true`** in the environment (see [`.env.example`](.env.example)); otherwise the route returns 404.

## UI locales and messages

- **Locales:** `en`, `fi`, `ru`, `uk` — URLs always include the prefix (e.g. `/en`, `/fi/recipes` when routes exist).
- **Catalogs:** [`apps/web/messages/`](apps/web/messages/) — edit all four JSON files when adding or changing UI strings.
- **Anonymous language preference:** cookie **`fc-locale`** (set via the language switcher). Database column **`profiles.preferred_language`** applies after Supabase auth ([`PROJECT_SPEC.md`](PROJECT_SPEC.md)); migration: [`supabase/migrations/20251106221000_profiles.sql`](supabase/migrations/20251106221000_profiles.sql).

## Initial UI languages

English (`en`), Finnish (`fi`), Russian (`ru`), and Ukrainian (`uk`) — recipe content languages are separate metadata.
