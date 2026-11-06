# Technical decisions

## T0.1 — Monorepo bootstrap (2026-11-06)

1. **Next.js 16.4.5** (Active LTS) instead of 15.x, after bootstrap-time registry check and Nov 2026 security patches.
2. **Node.js** target **22.x** locally (`.nvmrc`); `engines.node` is `>=20.9.0` per Next.js requirements.
3. **pnpm 12.16.1** pinned via root `packageManager`.
4. **Package scope** `@family-cookbook/*` for all workspace packages; all `private: true`.
5. **No Turborepo** — pnpm recursive scripts orchestrate build/lint/test at MVP scale.
6. **MCP SDK deferred** to T4.1; `apps/mcp` is a Hono service with `/health` only.
7. **Supabase client packages deferred** to T1.x. `.env.example` lists the public URL, anon key, app URL, MCP, and OAuth placeholders only. `SUPABASE_SERVICE_ROLE_KEY` is omitted until a non-request maintenance job is designed. User requests must keep using the anon key and RLS.
8. **TypeScript 5.9.3** with strict shared bases (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`) in library packages; Next app extends shared `nextjs.json` with Next-required overrides.
9. **ESLint 9.39.5** flat config across the workspace (aligned with `eslint-config-next` 16); shared `@family-cookbook/config/eslint/base` for libraries and MCP.
10. **Workspace tests** assume library packages are **built** before Vitest when cross-package `exports` resolve to `dist/` (root `test` script builds packages first).
11. **pnpm 12 dependency scripts** use `allowBuilds` in `pnpm-workspace.yaml`. Only `esbuild` is allowed, because it is the dependency with a `postinstall` this repo needs. `sharp` and `unrs-resolver` ship prebuilt optional packages and have no install script, so they are not listed. Do not run `pnpm approve-builds --all`; add a package to `allowBuilds` only after reviewing its script.
12. **Library `typecheck`** uses `tsc -b` (not `--noEmit`) so TypeScript project references resolve correctly. **Web `typecheck`** runs `next typegen` first. Next.js 16 gitignores `next-env.d.ts` and writes route types under `.next/`; `app/layout.tsx` imports CSS, which `tsc` accepts only after those files exist. `next-env.d.ts` is also in `.prettierignore` because Next rewrites it.
13. **No `$schema` in shared `tsconfig` fragments** under `packages/config/typescript/` — avoids VS Code/Cursor trying to download `json.schemastore.org` when `json.schemaDownload.enable` is off; `tsc` does not require it.
14. **Next.js cache components** (`cacheComponents` and `partialPrefetching`) are on in `apps/web/next.config.ts`. Later cookie, header, and other uncached server reads follow that Next.js 16 model.
