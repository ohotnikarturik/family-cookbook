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

## T0.2 — CI baseline (2026-11-06)

1. **GitHub Actions** workflow `.github/workflows/ci.yml` — triggers on `push` to `main` and `pull_request`; permissions `contents: read` only.
2. **Quality job:** Node **22**, `pnpm/action-setup` (reads `packageManager`), `pnpm install --frozen-lockfile`, then `format:check`, `lint`, `typecheck`, `test`, `build`, `verify:client-bundle`. Placeholder `NEXT_PUBLIC_*` env vars for Next build only (no service role).
3. **Security job:** Gitleaks via `gitleaks/gitleaks-action@v2` with `GITLEAKS_CONFIG: .gitleaks.toml`; **full history** on `push` to `main` (`fetch-depth: 0`), shallow checkout otherwise. Then `pnpm audit --audit-level high` (high/critical block; moderate/low do not).
4. **Client bundle check:** `scripts/verify-no-secrets-in-client-bundle.mjs` scans `apps/web/.next` `*.js`/`*.css` (excluding `.map`) for high-signal secret patterns after production build.
5. **allowBuilds** in `pnpm-workspace.yaml`: `esbuild`, `sharp`, `unrs-resolver`, and `@swc/core` (`next-intl` depends on it). Required so CI can run those install scripts without interactive `pnpm approve-builds`.
6. **Prettier** ignores `.gitleaks.toml` (no bundled TOML parser).

## T0.3 — Design system foundation (2026-11-07)

1. **Semantic tokens** live in `apps/web/app/globals.css` as CSS variables (OKLCH) with `@theme inline` mapping to Tailwind utilities; dark mode is **class-based** on `<html>` (`.dark`), resolved before first paint and by `ThemeProvider` on the client.
2. **Typography:** **Geist** sans + **Geist Mono** for UI/code; **Source Serif 4** (`next/font/google`, Latin + Cyrillic subsets) for display headings via `--font-source-serif` and `font-serif-display`.
3. **Theme preference** is stored in a **non-httpOnly** cookie `fc-theme` with values `system | light | dark` (aligns with future `profiles.theme_preference`). A **blocking inline script** in the root layout reads `document.cookie` and sets `.dark` / `color-scheme` with **no `cookies()` read in the root layout**, keeping Cache Components / static shells predictable.
4. **Persistence:** client changes call the server action `setThemePreferenceAction` so responses include `Set-Cookie`; `ThemeProvider` applies the class on change. It does not touch `documentElement` until the cookie has been read, so the inline script is not overwritten with `system` on hydration.
5. **UI primitives** follow shadcn-style patterns under `apps/web/components/ui/*` (Radix + CVA), **wired to semantic CSS variables** — not the default zinc scale.
6. **next-intl (before T0.4):** minimal single-locale setup; superseded by **T0.4** (see below).
7. **Design gallery** at `/{locale}/design`: **development by default** (`notFound()` in production). Enable on staging with **`NEXT_PUBLIC_ENABLE_DESIGN_GALLERY=true`**. A dev-only link appears on the home footer when `NODE_ENV !== 'production'`.

## T0.4 — Internationalization foundation (2026-11-07)

1. **Locales:** `en`, `fi`, `ru`, `uk` — message catalogs under [`apps/web/messages/`](../apps/web/messages/); add keys to all four files when changing user-facing copy.
2. **Routing:** **Always prefix** URLs with the locale (`localePrefix: 'always'`) via [`apps/web/i18n/routing.ts`](../apps/web/i18n/routing.ts) and [`apps/web/middleware.ts`](../apps/web/middleware.ts). Internal links use **`next-intl/navigation`** ([`apps/web/i18n/navigation.ts`](../apps/web/i18n/navigation.ts)).
3. **Locale resolution (middleware):** URL segment first, then next-intl’s locale detection (`Accept-Language` + **`fc-locale`** cookie, configured as `localeCookie.name` in `defineRouting`). **Anonymous preference:** `setLocalePreferenceAction` sets non-httpOnly `fc-locale`. **`profiles.preferred_language`** (Supabase) is the long-term source of truth after auth (**T1.3**); until then cookie + URL apply.
4. **`document.documentElement.lang`:** Root [`app/layout.tsx`](../apps/web/app/layout.tsx) sets a static default; [`DocumentLangSync`](../apps/web/components/i18n/document-lang-sync.tsx) updates `lang` on the client from `useLocale()` so we avoid `headers()` in the root layout (required for Cache Components / PPR static shell).
5. **Cache Components + next-intl:** `dynamic = 'force-dynamic'` is **disallowed** when `cacheComponents` is on. The async shell [`LocaleShell`](../apps/web/app/[locale]/locale-shell.tsx) runs **`await connection()`** + `getMessages` inside a **`<Suspense>`** boundary in [`app/[locale]/layout.tsx`](../apps/web/app/[locale]/layout.tsx) so the route can partial-prerender without blocking prerender on runtime data. Message catalogs are **static imports** in [`i18n/request.ts`](../apps/web/i18n/request.ts). A long-running Turbopack dev process can keep an already-evaluated JSON module after the catalogs change; the page then renders message paths until `next dev` is restarted. Pages that read `params` do that inside their own `<Suspense>` boundary; a boundary in the layout does not cover an instant navigation into the page. `AppProviders` is a Client Component, so it passes `timeZone` (`UTC`) into `NextIntlClientProvider` explicitly. The home date sample formats the fixed instant `2026-03-15T14:30:00.000Z` in that zone, so English shows Mar 15, 2026, 2:30 PM.
6. **Sample validation:** Zod schema [`sampleDisplayNameSchema`](../packages/contracts/src/sample-profile.ts) in `@family-cookbook/contracts`; Server Action [`submitSampleDisplayNameAction`](../apps/web/app/actions/sample-profile.ts) maps issues to [`validation.*`](../apps/web/messages/en.json) messages for the current locale (from `fc-locale` cookie).
7. **Body font & Cyrillic:** **Geist** sans remains Latin-only; **Source Serif 4** loads Latin + Cyrillic for display. If RU/UK body copy looks wrong, add a Cyrillic-capable sans in a later design pass.
8. **Supabase:** First migration [`supabase/migrations/20251106221000_profiles.sql`](../supabase/migrations/20251106221000_profiles.sql) adds `profiles` with `preferred_language` and `theme_preference`, RLS (own row only), and table grants for `authenticated` select/insert/update. No delete grant and no delete policy. Apply with Supabase CLI when local stack exists (**T1.1**).
9. **Next.js middleware warning:** Next 16.4 may log deprecation of the `middleware` file in favor of **proxy** — tracked for a follow-up codemod; behavior unchanged for this task.
10. **Radix + Partial Prerender:** Radix Dialog wires `aria-controls` from React `useId()`. Under PPR, server HTML and client hydration can disagree on those IDs. **`next/dynamic(..., { ssr: false })` is not allowed inside Server Components** (Next 16). The design gallery loads the dialog sample via a tiny Client Component [`DialogSampleLoader`](../apps/web/app/[locale]/design/dialog-sample-loader.tsx) so the Dialog subtree mounts only on the client.
11. **Server `getTranslations` + PPR:** Passing only a namespace (e.g. `getTranslations('home')`) lets next-intl resolve the locale from headers / `setRequestLocale`, which can be wrong during the static shell pass. **Server Components pass `locale` from `[locale]` params:** `getTranslations({ locale, namespace: 'home' })` (same for `design`).

## T1.1 — Local Supabase setup (2026-11-07)

1. **CLI:** [`supabase`](https://www.npmjs.com/package/supabase) **3.0.0** devDependency; root `pnpm supabase:*` scripts wrap `start` / `stop` / `status` / `env` / `db reset` / `migration up`. **`pnpm supabase:start`** runs [`scripts/supabase-start.mjs`](../scripts/supabase-start.mjs): full start first, then **`start -x studio`** if Studio’s `supabase/snippets` bind mount fails (common on macOS under `~/Desktop`). **`supabase:start:full`** and **`supabase:start:core`** are explicit variants; **`supabase:query`** runs local SQL without Studio.
2. **Config:** [`supabase/config.toml`](../supabase/config.toml) — `project_id = family-cookbook`; Auth `site_url` and redirects for web on port **3003**; `[db.seed]` → [`supabase/seed.sql`](../supabase/seed.sql). **`auto_expose_new_tables = false`** so new `public` tables need explicit grants (the profiles migration already revokes and re-grants). Local Auth **`email_sent = 100`** per hour so magic-link tests are not stuck on the CLI default of 2.
3. **Seed (T1.1 scope):** deterministic `auth.users` + `auth.identities` + `public.profiles` only — seven personas in [`docs/fixtures/TEST_IDENTITIES.md`](fixtures/TEST_IDENTITIES.md), including **Admin A**, so every spec role (`owner`, `admin`, `editor`, `contributor`, `viewer`) has a user; shared local password documented there. **No** `families` / `family_members` until **T1.2**.
4. **Fixed UUIDs:** user IDs use stable prefixes (`1111…` Family A cast, `2222…` Family B, `3333…` multi-family); reserved family IDs documented for T1.2 seed extension.
5. **Docs:** [`docs/LOCAL_SUPABASE.md`](LOCAL_SUPABASE.md) + README section; canonical reset workflow is `pnpm supabase:reset`.
6. **Secrets:** no `service_role` in repo or `.env.example`; local keys from `supabase status -o env` into gitignored `.env.local`.
7. **pgTAP:** placeholder [`supabase/tests/README.md`](../supabase/tests/README.md) until T1.2.
8. **CI:** migration reset job deferred until pgTAP/Docker in GHA (PROJECT_SPEC §18.5).
