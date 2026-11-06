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

## Setup

```bash
cp .env.example .env.local   # placeholders only; configure in later tasks
pnpm install
```

Dependency install scripts are limited to `esbuild` in `pnpm-workspace.yaml`. If install reports `ERR_PNPM_IGNORED_BUILDS` for another package, review that script and add it to `allowBuilds`. Do not approve every build script.

## Commands (repository root)

```bash
pnpm dev:web          # Next.js dev server (http://localhost:3003)
pnpm dev:mcp          # MCP placeholder (default http://localhost:8787)
pnpm build            # Build all packages, then apps
pnpm typecheck        # TypeScript across workspace; web runs `next typegen` first
pnpm lint             # ESLint across workspace
pnpm test             # Build libraries, then Vitest smoke tests
pnpm format:check     # Prettier check
pnpm format           # Prettier write
```

## Initial UI languages

English (`en`), Finnish (`fi`), Russian (`ru`), and Ukrainian (`uk`) — UI i18n foundation is task T0.4. Recipe content languages are separate metadata.
