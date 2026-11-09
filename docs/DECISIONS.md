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
10. **Workspace packages resolve to `dist/`.** Root `test` and `dev:web` build `packages/*` first. After a library change, restart `pnpm dev:web`: Turbopack keeps a static export map for those `dist` files and will report missing exports until the dev server starts again.
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
2. **Routing:** **Always prefix** URLs with the locale (`localePrefix: 'always'`) via [`apps/web/i18n/routing.ts`](../apps/web/i18n/routing.ts) and [`apps/web/proxy.ts`](../apps/web/proxy.ts). Internal links use **`next-intl/navigation`** ([`apps/web/i18n/navigation.ts`](../apps/web/i18n/navigation.ts)).
3. **Locale resolution (middleware):** URL segment first, then next-intl’s locale detection (`Accept-Language` + **`fc-locale`** cookie, configured as `localeCookie.name` in `defineRouting`). **Anonymous preference:** `setLocalePreferenceAction` sets non-httpOnly `fc-locale`. **`profiles.preferred_language`** (Supabase) is the long-term source of truth after auth (**T1.3**); until then cookie + URL apply.
4. **`document.documentElement.lang`:** Root [`app/layout.tsx`](../apps/web/app/layout.tsx) sets a static default; [`DocumentLangSync`](../apps/web/components/i18n/document-lang-sync.tsx) updates `lang` on the client from `useLocale()` so we avoid `headers()` in the root layout (required for Cache Components / PPR static shell).
5. **Cache Components + next-intl:** `dynamic = 'force-dynamic'` is **disallowed** when `cacheComponents` is on. The async shell [`LocaleShell`](../apps/web/app/[locale]/locale-shell.tsx) runs **`await connection()`** + `getMessages` inside a **`<Suspense>`** boundary in [`app/[locale]/layout.tsx`](../apps/web/app/[locale]/layout.tsx) so the route can partial-prerender without blocking prerender on runtime data. Document title and description are a **static** `metadata` export (English catalog). `generateMetadata` that awaited `params` logged `URL data in generateMetadata` on navigations even with a `connection()` marker. [`DocumentLangSync`](../apps/web/components/i18n/document-lang-sync.tsx) applies the active locale's title and description after hydration. `allowedDevOrigins` includes `127.0.0.1` so dev HMR works when the browser uses that host instead of `localhost`. Message catalogs are **static imports** in [`i18n/request.ts`](../apps/web/i18n/request.ts). A long-running Turbopack dev process can keep an already-evaluated JSON module after the catalogs change; the page then renders message paths until `next dev` is restarted. Pages that read `params` do that inside their own `<Suspense>` boundary; a boundary in the layout does not cover an instant navigation into the page. `AppProviders` is a Client Component, so it passes `timeZone` (`UTC`) into `NextIntlClientProvider` explicitly. The home date sample formats the fixed instant `2026-03-15T14:30:00.000Z` in that zone, so English shows Mar 15, 2026, 2:30 PM.
6. **Sample validation:** Zod schema [`sampleDisplayNameSchema`](../packages/contracts/src/sample-profile.ts) in `@family-cookbook/contracts`; Server Action [`submitSampleDisplayNameAction`](../apps/web/app/actions/sample-profile.ts) maps issues to [`validation.*`](../apps/web/messages/en.json) messages for the current locale (from `fc-locale` cookie).
7. **Body font & Cyrillic:** **Geist** sans remains Latin-only; **Source Serif 4** loads Latin + Cyrillic for display. If RU/UK body copy looks wrong, add a Cyrillic-capable sans in a later design pass.
8. **Supabase:** First migration [`supabase/migrations/20251106221000_profiles.sql`](../supabase/migrations/20251106221000_profiles.sql) adds `profiles` with `preferred_language` and `theme_preference`, RLS (own row only), and table grants for `authenticated` select/insert/update. No delete grant and no delete policy. Apply with Supabase CLI when local stack exists (**T1.1**).
9. **Next.js Proxy:** Next 16 renames `middleware.ts` to [`apps/web/proxy.ts`](../apps/web/proxy.ts) and the exported function to `proxy`. Same request boundary as the old middleware file. The root `<body>` sets `suppressHydrationWarning` because browser extensions inject attributes there; the theme script already does the same on `<html>`.
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
8. **CI:** pgTAP job added in W35.11 (`ci.yml` → `pgtap`: `supabase:db:start`, `supabase:reset`, `supabase:test`).

## T1.2 — Base schema and RLS helpers (2026-11-07)

1. **Migration** [`supabase/migrations/20251107200000_tenant_schema_and_rls.sql`](../supabase/migrations/20251107200000_tenant_schema_and_rls.sql): enums `family_role`, `membership_status`; tables `families`, `family_members`, `family_invitations`; partial unique index `family_members_one_active_owner_uidx` (at most one active owner per family).
2. **RLS helpers** in schema **`private`** (not API-exposed): `SECURITY DEFINER`, `search_path = pg_catalog, public`; `EXECUTE` granted only to `authenticated` on predicates used by policies.
3. **Policies:** members read tenant rows via `private.is_active_member`; family create by `created_by = auth.uid()`; membership bootstrap (creator → sole owner) or owner/admin invite with §6.2 role guards (`membership_role_allowed_for_inviter` — admin cannot assign admin/owner; only owner may invite admin). No `DELETE` grants on tenant tables in MVP.
4. **pgTAP:** [`supabase/tests/`](../supabase/tests/) + **`pnpm supabase:test`** ([`scripts/supabase-test.mjs`](../scripts/supabase-test.mjs) via `docker exec` when Desktop bind mounts block `supabase test db`); JWT shim **`tests.request_as_user`** (`SECURITY INVOKER`, superuser-only; fix in [`20251107213000_fix_tests_request_as_user.sql`](../supabase/migrations/20251107213000_fix_tests_request_as_user.sql)).
5. **Seed:** Families A/B and memberships in [`supabase/seed.sql`](../supabase/seed.sql); **Multi Family** is `editor` in A and `viewer` in B (stable IDs in [`docs/fixtures/TEST_IDENTITIES.md`](fixtures/TEST_IDENTITIES.md)).
6. **Deferred to T1.5+:** deferred “≥1 active owner” constraint trigger, permanent owner-transfer definer function. (Invitation redemption RPC delivered in T1.5.)

## T1.3 — Authentication and profile bootstrap (2026-11-07)

1. **Supabase clients:** `@supabase/ssr` **0.12.7**, `@supabase/supabase-js` **2.119.0** in [`packages/data-access`](../packages/data-access); subpath exports (`supabase/server`, `middleware`, `browser`, `auth/*`, `profile/*`). Next imports use **`.js` suffix** for `NodeNext` resolution.
2. **`AppSupabaseClient`** type = `Awaited<ReturnType<typeof createServerSupabaseClient>>` to avoid duplicate `SupabaseClient` nominal types under pnpm.
3. **Proxy:** [`apps/web/proxy.ts`](../apps/web/proxy.ts) refreshes the session **before** next-intl. `updateSession` writes rotated cookies onto the request and rebuilds `NextResponse.next({ request })`, and copies Supabase `Cache-Control` / `Expires` / `Pragma` onto that response. Localized routes then copy those `Set-Cookie` and no-store headers onto the intl response. `/auth/*` (including unlocalized `/auth/callback`) returns the session response directly.
4. **Auth UX:** magic link + email OTP on `/{locale}/auth/sign-in`; callback at `/auth/callback`; protected probe `/{locale}/account`; sign-out Server Action. **No** `localStorage` tokens in app code. Every `next` / `returnTo` value goes through `sanitizeAuthRedirect` (relative path only; rejects `//`, backslashes, and control characters). Email codes must be 6 digits (`authEmailOtpSchema`, matching `auth.email.otp_length`).
5. **Profile bootstrap:** `ensureProfile` inserts only when missing; `user_id` from verified `auth.getUser()`; hints from `fc-locale` / `fc-theme` on first insert; existing seed rows unchanged. The callback, OTP verify, and `/{locale}/account` all call `ensureProfileForCurrentUser`, so a missed insert is retried on the next authenticated account view.
6. **Mailpit:** local sign-in emails at http://127.0.0.1:54324 are **PKCE magic links only** (no 6-digit OTP in the default template). Use the link; the on-page OTP form is for environments that include `{{ .Token }}` in email — documented in [`docs/LOCAL_SUPABASE.md`](LOCAL_SUPABASE.md#magic-link-vs-email-code-local).
7. **Env and cookies:** **`pnpm supabase:sync-env`** writes [`apps/web/.env.local`](../apps/web/.env.local) (Next 16.4 does not support `envDir`; the web app loads env from its package directory only). `site_url` is `http://localhost:3003`. The magic-link callback uses the request `Host` when it is that app host or, outside production, `localhost` / `127.0.0.1` on the same port, so the PKCE cookie host matches the link. Production always uses `NEXT_PUBLIC_APP_URL`. Auth cookie `secure` is true when `NODE_ENV` is `production`. `@supabase/ssr` keeps `httpOnly: false` because its browser client reads the cookie.

## T1.4 — Family lifecycle and selection (2026-11-07)

1. **Migration** [`supabase/migrations/20251107220000_family_bootstrap_and_preference.sql`](../supabase/migrations/20251107220000_family_bootstrap_and_preference.sql): `profiles.last_selected_family_id` (nullable FK, UX only); `profiles_sanitize_last_selected_family` trigger clears invalid preferences; `public.create_family_bootstrap(name, default_language)` `SECURITY DEFINER` RPC creates family + sole owner in one transaction (`GRANT EXECUTE` to `authenticated` only).
2. **Shared use cases** in [`packages/application`](../packages/application) (`createFamily`, `listMyFamilies`, `resolveAccessibleFamily`, `resolveDefaultFamilyId`, `setActiveFamilyPreference`) with repositories in [`packages/data-access`](../packages/data-access). Zod boundaries in [`packages/contracts`](../packages/contracts/src/family.ts).
3. **Authorization:** every family-scoped read uses an explicit `familyId` (route param or RPC argument) plus RLS; `resolveDefaultFamilyId` / `last_selected_family_id` only pick among **verified** active memberships.
4. **Web routes:** `/{locale}/onboarding` (create-only), `/{locale}/families`, `/{locale}/f/[familyId]` placeholder dashboard + [`FamilySwitcher`](../apps/web/components/family/family-switcher.tsx). Signed-in `/` and post-auth callback land via [`resolveSignedInLandingPath`](../apps/web/lib/post-auth-path.ts) (onboarding if zero families, else preferred/first dashboard).
5. **pgTAP:** [`supabase/tests/50_family_bootstrap.sql`](../supabase/tests/50_family_bootstrap.sql) covers RPC bootstrap, preference trigger, and cross-family regression.

## T1.5 — Invitation flow (2026-11-07)

1. **Migration** [`supabase/migrations/20251107230000_invitation_redemption.sql`](../supabase/migrations/20251107230000_invitation_redemption.sql): partial unique index on pending `(family_id, email_normalized)`; `public.accept_family_invitation(p_token text) returns uuid` (`SECURITY DEFINER`, fixed `search_path`, `GRANT EXECUTE` to `authenticated` only). Token stored as **SHA-256 hex** (`encode(digest(...), 'hex')`), matching app [`hashInvitationToken`](../packages/data-access/src/invitations/hash-token.ts). Redemption uses `SELECT … FOR UPDATE`, confirmed **session email** (`email_confirmed_at`) vs `email_normalized`, rejects expired/revoked/replay/already-member, then inserts `family_members` and sets `accepted_at` / `accepted_by` in one transaction.
2. **Guards** [`supabase/migrations/20251107234500_invitation_guards.sql`](../supabase/migrations/20251107234500_invitation_guards.sql): a pending invite can only be revoked by an authenticated manager. Role, email, token hash, and the other columns stay as inserted. The redemption update is allowed only when `accept_family_invitation` sets the transaction-local `family_cookbook.invitation_redeem` flag. Authenticated `family_members` insert is limited to creator bootstrap; every later join goes through the redemption function.
3. **Application:** create/revoke/accept/list in [`packages/application/src/invitations/`](../packages/application/src/invitations/). Raw token only in the rendered email and accept URL query; never persisted or logged. **7-day** `expires_at` on insert. A failed send revokes the new row so the same address can be invited again. An expired pending row is revoked and replaced on the next send. After accept, `setActiveFamilyPreference` (T1.4) is best-effort and does not undo the membership.
4. **Email:** [`InvitationEmailSender`](../packages/application/src/invitations/email-sender.ts) port. The web app fills subject and body from `next-intl` and escapes HTML. Local **Mailpit SMTP** on `127.0.0.1:54325` via Nodemailer when `INVITATION_SMTP_HOST` is loopback ([`supabase/config.toml`](../supabase/config.toml) `[local_smtp]`); certificate checks are skipped only for that local host. Any other SMTP host keeps certificate verification. No secrets in repo. Nodemailer is pinned at **10.3.1**. 7.0.11 sits inside every current high advisory, and the strictest patched range is `>=10.0.6`. 10.4.0 is inside the one-day `minimumReleaseAge` window, so 10.3.1 is the newest release that clears `pnpm audit --audit-level high` without a release-age exception. The sender still calls `createTransport` and `sendMail` with text and HTML only.
5. **Accept URL:** `{NEXT_PUBLIC_APP_URL}/{locale}/invite/accept?token={raw}`; anonymous users redirect to sign-in with `next` preserving the token. The accept screen can sign out and return to the same link when the session email is wrong.
6. **pgTAP:** [`supabase/tests/60_invitation_redemption.sql`](../supabase/tests/60_invitation_redemption.sql) — happy path (including invited role), replay, revoked, expired, wrong email, unknown token. [`70_invitation_guards.sql`](../supabase/tests/70_invitation_guards.sql) — admin cannot rewrite role, email, or token hash; admin cannot insert a member directly; owner can revoke; unconfirmed email cannot redeem. Role matrix on insert remains in [`30_role_restrictions.sql`](../supabase/tests/30_role_restrictions.sql).

## T2.1 — Recipe schemas and aggregate model (2026-11-07)

1. **Contracts** [`packages/contracts/src/recipe-*.ts`](../packages/contracts/src/): Zod boundaries for create/update, ingredients, steps, tags, translations, search, and lifecycle (`expected_version`, `confirm: true` on archive). Field bounds match PROJECT_SPEC §7.1 (`numeric(8,2)` servings, `numeric(12,4)` quantity, durations ≤ 525_600 minutes); search/history `limit` is **1–50**.
2. **Recipe language tags:** [`recipeLanguageTagSchema`](../packages/contracts/src/recipe-language.ts) (trimmed BCP 47 regex, max 35 chars) — separate from UI [`profilePreferredLanguageSchema`](../packages/contracts/src/profile-bootstrap.ts) (`en`/`fi`/`ru`/`uk`).
3. **Wire array caps:** 500 ingredients, 500 steps, 50 tags, 20 recipe-level translations, and 10_000 ingredient/step translations (documented constants in [`recipe-limits.ts`](../packages/contracts/src/recipe-limits.ts)). Ingredient `quantity` and `quantityText` may both be absent per spec.
4. **Positions and consistency:** create/update payloads require **1-based contiguous** `position` on ingredients and steps ([`recipe-positions.ts`](../packages/contracts/src/recipe-positions.ts)). Cross-field checks reject duplicate tags/translation languages, translation language equal to `sourceLanguage`, and translation positions that do not exist on the parent arrays.
5. **Update is a full aggregate replace.** Collection arrays are required and have **no `default([])`**, so omitting them cannot wipe child rows. Create still defaults missing collections to empty arrays.
6. **Domain** [`packages/domain`](../packages/domain): pure `RecipeAggregate` read-model types (including ingredient/step translations), status unions, and `isRecipeVersionConflict` / `recipeVersionMatches` (no `contracts` dependency).
7. **Permissions** [`packages/permissions/src/recipe-capabilities.ts`](../packages/permissions/src/recipe-capabilities.ts): recipe capability matrix per PROJECT_SPEC §6.2; package depends on `@family-cookbook/contracts` for `FamilyRole`. Invitation capabilities remain in `application` until a later refactor.
8. **Tests:** Vitest in `contracts` (`recipe-validation.test.ts`), `domain` (`recipe-version.test.ts`), and `permissions` (`recipe-capabilities.test.ts`).

## T2.2 — Recipe database schema (2026-11-08)

1. **Migration** [`supabase/migrations/20251108020000_recipe_schema_and_rls.sql`](../supabase/migrations/20251108020000_recipe_schema_and_rls.sql): enums `recipe_status`, `translation_review_status`; tables through `audit_events` per PROJECT_SPEC §7.1; CHECK bounds aligned with `packages/contracts` recipe limits; composite `(id, family_id)` FKs on all family-owned children.
2. **Deferred:** `recipe_assets` and `recipe_steps.media_asset_id` FK (**T3.1**). Transactional aggregate write RPC and child-row `DELETE` grants (**T2.3**).
3. **Search:** `pg_trgm` (schema `extensions`) GIN on `recipes.title`; stored `search_document tsvector` (`simple`) on title/description/category; index on `recipe_ingredients (family_id, name)`.
4. **private helpers:** `can_create_recipe`, `can_edit_recipe`, `can_manage_recipe_tags`, `can_view_recipe_history`, `can_view_audit_events` — mirror `packages/permissions` recipe matrix; `EXECUTE` granted to `authenticated` only.
5. **RLS:** members read recipe aggregate; writes use editor/contributor-ownership rules; revisions append-only insert; audit **select** owner/admin/editor only; audit **insert** non-viewer members with `actor_user_id = auth.uid()`. No `DELETE` grants on recipe/audit tables.
6. **Identity:** `private.recipes_guard_identity` / `private.reject_family_id_change` keep `family_id` (and recipe `created_by`) immutable even when the table owner bypasses RLS. `recipe_revisions` and `audit_events` reject `UPDATE`.
7. **family_tags:** `private.family_tag_normalize_name` sets `normalized_name` from trimmed `name`; CHECK rejects whitespace-only names.
8. **pgTAP:** extended [`01_rls_enabled.sql`](../supabase/tests/01_rls_enabled.sql); new [`80_recipe_composite_fk.sql`](../supabase/tests/80_recipe_composite_fk.sql), [`81_recipe_cross_family_isolation.sql`](../supabase/tests/81_recipe_cross_family_isolation.sql), [`82_recipe_role_restrictions.sql`](../supabase/tests/82_recipe_role_restrictions.sql). Contributor update denial asserted via unchanged title (RLS returns 0 rows, no SQLSTATE).

## T2.3 — Shared recipe use cases (2026-11-08)

1. **Migration** [`supabase/migrations/20251108030000_recipe_aggregate_rpcs.sql`](../supabase/migrations/20251108030000_recipe_aggregate_rpcs.sql): `create_recipe_aggregate`, `update_recipe_aggregate`, `set_recipe_status` (`SECURITY DEFINER`) — atomic child replace, `version` bump, `recipe_revisions` + `audit_events` (`metadata` = `{ recipe_id, version }` only). Version mismatch raises SQLSTATE **`23514`** with message `version_conflict` and detail = current version. Other `23514` check failures stay `mutation_failed`.
2. **Payload wire format:** camelCase JSON keys in `p_payload` (matches TS `recipePayloadToRpcJson`). Create may omit child arrays. **Update requires** the six collection arrays so a partial body cannot wipe children. Array lengths are capped in SQL. Non-members get `recipe not found` (`P0002`), not forbidden. Repeating the current archive/restore status does not bump `version`.
3. **Revision snapshot** is the full aggregate: recipe (without `search_document`), ingredients, steps, tags, recipe translations, and ingredient/step translations.
4. **Tags in RPC:** resolve by `tagId` or `name`; new `family_tags` rows only when `private.can_manage_recipe_tags`.
5. **Data access** [`packages/data-access/src/recipe/`](../packages/data-access/src/recipe/): RPC wrappers with error mapping; `getRecipeById` (numeric columns coerced from PostgREST strings), `searchRecipes` (FTS + filters + sort-specific keyset cursor; ingredient/tag filters are embedded so they are not truncated at `max_rows`), `listRecipeRevisions`, `getRecipeHeader`. Cursor values are quoted before they go into PostgREST `.or()` filters. Translation-language search remains **T3.4**.
6. **Application** [`packages/application/src/recipe/`](../packages/application/src/recipe/): seven use cases validate with `@family-cookbook/contracts`, check `@family-cookbook/permissions`, then call repositories.
7. **Read DTOs:** [`packages/contracts/src/recipe-read.ts`](../packages/contracts/src/recipe-read.ts) — `recipeSummarySchema`, `recipeDetailSchema`, `recipeSearchResultSchema`, `recipeHistoryResultSchema` (history list omits revision `snapshot` bodies).
8. **Tests:** Vitest [`recipe-use-cases.test.ts`](../packages/application/src/recipe/recipe-use-cases.test.ts) plus data-access cursor/error/mapping tests; pgTAP [`90_recipe_aggregate_rpc.sql`](../supabase/tests/90_recipe_aggregate_rpc.sql).

## T2.4 — Web dashboard and recipe browsing (2026-11-08)

1. **Routes:** `/{locale}/f/[familyId]/recipes` (URL-driven filters + cursor pagination) and `/{locale}/f/[familyId]/recipes/[recipeId]` read-only detail. Create/edit deferred to T2.5.
2. **Reads:** Server Components call `searchRecipes` / `getRecipe` with `createServerSupabaseClient()` — no read Server Actions.
3. **`getRecipe` auth:** Application layer now requires active membership + `canViewRecipes` (parity with `searchRecipes`); `forbidden` surfaced on detail for cross-tenant URL probes.
4. **Seed:** [`supabase/seed-recipes.sql`](../supabase/seed-recipes.sql) (second `db.seed` path) — deterministic showcase recipes + 28 Family A fillers for pagination; documented in [`TEST_IDENTITIES.md`](fixtures/TEST_IDENTITIES.md). Manual UI playbook: [`UI_TEST_T2_4.md`](fixtures/UI_TEST_T2_4.md).
5. **Dashboard:** Recent five recipes + **Browse all recipes** CTA; **Add recipe** button waits for T2.5 to avoid dead links. A failed recent-recipe query shows the error state rather than an empty list.
6. **i18n:** `recipes.*` namespace in `en` / `fi` / `ru` / `uk`; recipe body uses `lang` when source language differs from UI locale. The search form includes the ingredient filter the URL parser already accepted. Detail shows quantity, unit, and notes. The family name stays the only `h1`.
7. **Seed timestamps:** archived showcase recipe sets `archived_at` in the insert. A follow-up update would run `recipes_set_updated_at` and erase the historical `updated_at`. pgTAP 81 asserts specific recipe ids so seeded rows do not change the expected counts.
8. **Missing pages:** `notFound()` inside the cache-component `Suspense` boundary rendered a blank document. Family membership misses and unknown recipes render `UnavailablePage` instead. `app/[locale]/not-found.tsx` still covers other `notFound()` calls.
9. **a11y gate:** `@playwright/test` + `@axe-core/playwright` smoke on `/auth/sign-in` (`apps/web/e2e/sign-in-a11y.spec.ts`); recipe journeys documented for manual sign-off with Mailpit personas.

## T2.5 — Recipe editor (web)

1. **Routes:** `/{locale}/f/[familyId]/recipes/new` and `…/recipes/[recipeId]/edit`. Entry CTAs on dashboard, recipe list, and detail when `canCreateRecipe` / `canEditRecipe`.
2. **Mutations:** Server Actions [`apps/web/app/actions/recipe.ts`](../apps/web/app/actions/recipe.ts) call shared `createRecipe` / `updateRecipe`. Client sends a JSON `payload` field (editor draft); server maps to contract payloads via [`apps/web/lib/recipe-editor/`](../apps/web/lib/recipe-editor/). Failed validation returns the draft in action state for rehydration.
3. **Translations on update:** Recipe-level translations from `getRecipe` are passed through hidden `preserved` JSON. Ingredient/step translation rows are not loaded in the read DTO yet (no seed data); passthrough arrays are empty until T3.3 extends reads.
4. **Tags:** UI attaches `{ tagId }` or `{ name }`. Contributors see copy that new tag names require editor+; RPC `42501` surfaces as forbidden on save.
5. **Manual UI playbook:** [`docs/fixtures/UI_TEST_T2_5.md`](fixtures/UI_TEST_T2_5.md).
6. **Editor validation:** a completely empty ingredient or step row is omitted. A row with any other value but no name or instruction is rejected and kept on the form. Renaming an attached tag drops `tagId` so the typed name is what gets saved. Servings and quantities accept a decimal comma (`1,5`). Field messages come from the `recipes.editor.errors` catalogs. The version-conflict reload is a normal link to the edit URL, because a client navigation to the current URL does not refetch `expected_version`. The editor form posts through the form `action` so save stays in a React transition. Recipe detail, create, and edit pages set `instant = false` because they read the session; otherwise the dev server logs that the detail segment was dropped from instant-navigation checks.

## T2.6 — Revision history and audit UI (2026-11-08)

1. **Route:** `/{locale}/f/[familyId]/recipes/[recipeId]/history` — Server Component reads via `getRecipeHistory` and, for owner/admin/editor, `getRecipeAuditLog`.
2. **Permissions:** `canViewRecipeHistory` gates the page and detail **View history** link (contributor own-recipe only; viewers denied). `canViewAuditEvents` gates the **Security log** block only.
3. **Privacy:** UI lists revision metadata (`version`, `changeSummary`, `changedBy`, `createdAt`) — not `snapshot` JSON. Audit list shows `event_type`, actor id, and shallow `metadata` (`recipe_id`, `version`) only. Actor labels use **You** vs **family member** because `profiles` RLS is select-own (no cross-member display names).
4. **Contracts:** [`packages/contracts/src/recipe-audit-read.ts`](../packages/contracts/src/recipe-audit-read.ts) — `auditEventSummarySchema`, `getRecipeAuditInputSchema` (same bounds as history pagination).
5. **Data access:** [`listRecipeAuditEvents`](../packages/data-access/src/audit/list-recipe-audit-events.ts) with `created_at`+`id` keyset cursors in [`search-cursor.ts`](../packages/data-access/src/recipe/search-cursor.ts).
6. **pgTAP:** [`91_recipe_revision_audit_pairing.sql`](../supabase/tests/91_recipe_revision_audit_pairing.sql) asserts 1:1 revision+audit on success and unchanged counts on validation failure / version conflict; [`90_recipe_aggregate_rpc.sql`](../supabase/tests/90_recipe_aggregate_rpc.sql) asserts idempotent archive does not add audit rows.
7. **Manual UI playbook:** [`docs/fixtures/UI_TEST_T2_6.md`](fixtures/UI_TEST_T2_6.md).
8. **Headings and cursors:** The family layout owns the only `h1`. The history title is an `h2`; revision and security-log sections are `h3`. Revisions page with `cursor`; the security log pages with `auditCursor`. Each pager keeps the other param. The subtitle marks the recipe title with `lang` when its source language differs from the UI locale.

## T3.1 — Private storage and upload workflow (2026-11-08)

1. **Migration** [`supabase/migrations/20251108100000_recipe_assets_and_storage.sql`](../supabase/migrations/20251108100000_recipe_assets_and_storage.sql) plus corrective [`20251108110000_recipe_asset_upload_guards.sql`](../supabase/migrations/20251108110000_recipe_asset_upload_guards.sql) and [`20251108120000_recipe_asset_rejected_select.sql`](../supabase/migrations/20251108120000_recipe_asset_rejected_select.sql): `recipe_assets`, `recipe_steps.media_asset_id` FK, private bucket `family-recipe-media`, storage policies, 10-asset trigger, pgTAP [`92_recipe_assets_rls.sql`](../supabase/tests/92_recipe_assets_rls.sql).
2. **Object paths:** `{familyId}/{recipeId}/{assetId}/{randomUuid}` — never user filenames in paths; `original_filename` display-only and cannot contain slashes or control characters. The row’s `bucket_id` is fixed to `family-recipe-media`. Photo kinds are images; `original_document` is PDF. Image rows are capped at 15 MiB and PDFs at 25 MiB in the table check, not only in the route.
3. **API:** `POST /api/families/{familyId}/recipes/{recipeId}/uploads` (slot) and `.../uploads/{assetId}/finalize` — session cookie auth, shared use cases; no editor UI until T3.2. A failed signed-URL mint, or a signed URL that cannot be returned, marks the pending row rejected so it does not consume the 10-asset cap. Finalize reports `rejected` only after that status is stored.
4. **Validation:** [`packages/domain/src/file-signature.ts`](../packages/domain/src/file-signature.ts) magic-byte sniff + SHA-256; finalize rejects mismatch/oversize/missing object (`422 rejected`). A direct update can become `available` only when a storage object already exists for that path and the mime, size, and checksum constraints hold. Members can read `available` rows. `pending` and `rejected` rows are visible to the uploader and to editor+, because an update’s new row must also pass the select policy and the client reads the stored status back. `quarantined` stays unreadable. Storage policies compare `recipe_assets.bucket_id` to `storage.objects.bucket_id` by name; an unqualified `bucket_id` inside the subquery bound to the asset row and was always true.
5. **Signed upload URL:** Supabase `createSignedUploadUrl(path, { upsert: false })`. `expiresAt` is the token `exp` claim when the token is a JWT, otherwise [`RECIPE_UPLOAD_SIGNED_URL_TTL_SECONDS`](../packages/contracts/src/recipe-asset.ts) (600s).
6. **Rate limits:** deferred to T5.1; fixture [`docs/fixtures/API_TEST_T3_1.md`](fixtures/API_TEST_T3_1.md).
7. **Helper grants:** `private.storage_recipe_asset_family_id` is executable by `authenticated` because storage policies call it. `private.recipe_asset_count` is not; only the security-definer limit trigger uses it, so a member cannot count another family’s assets.

## T3.2 — Media display (2026-11-09)

1. **Read path:** `getRecipe` / `RecipeDetail` includes `assets[]` metadata only (`processing_status = available` in the mapper). Step rows expose optional `mediaAssetId` for inline step photos.
2. **Download URL:** `GET /api/families/{familyId}/recipes/{recipeId}/assets/{assetId}/download-url` → `createRecipeAssetDownloadUrl`. TTL [`RECIPE_DOWNLOAD_SIGNED_URL_TTL_SECONDS`](../packages/contracts/src/recipe-asset.ts) (600s, same as upload). URLs are not logged or stored server-side.
3. **Disposition:** Images use signed URLs without a forced download filename (inline display). PDFs pass [`safeRecipeAssetDownloadFilename`](../packages/domain/src/safe-download-filename.ts) into Supabase `createSignedUrl` as `attachment`. No in-page PDF preview. The download name is ASCII (`A–Z`, `a–z`, digits, space, `.`, `_`, `-`) with an extension that matches the detected type. storage-js runs the `download` query through `URLSearchParams` and then `encodeURI`, so other characters come back as literal `%XX` text. A name that is only those characters falls back to `recipe-source.pdf` or `recipe-photo.jpg`. The original filename stays on the page as text.
4. **UI:** Recipe detail [`RecipeMediaGallery`](../apps/web/components/recipe/recipe-media-gallery.tsx) fetches URLs client-side and refreshes them before the 600s TTL. It uses native `<img>` (not `next/image`) only when the response is an inline image. PDF links are used only when the response is an attachment. The download route sends `Cache-Control: private, no-store`. A `step_photo` that is an available image renders on its step and is left out of the gallery; other available assets stay in the gallery. Object paths and checksums are not passed into the client components. Upload UI shipped later in **W35.1**.
5. **Derivatives / EXIF:** deferred; originals stay in the private bucket.
6. **Manual UI playbook:** [`docs/fixtures/UI_TEST_T3_2.md`](fixtures/UI_TEST_T3_2.md).

## T3.3 — Manual translations (2026-11-09)

1. **Writes:** [`public.upsert_recipe_translations`](supabase/migrations/20251109100000_upsert_recipe_translations.sql) updates translation tables only, bumps `recipes.version`, and writes revision/audit — it does **not** change `recipes.title`, ingredients, or steps.
2. **Reads:** `RecipeDetail` includes `ingredientTranslations` and `stepTranslations`. Display overlay uses [`resolveRecipeDisplay`](../packages/domain/src/resolve-recipe-display.ts); detail URL uses `?viewLang=`.
3. **Review:** Contributors may save translations as `unreviewed` only; owner/admin/editor may set `reviewed` via RPC `reviewStatus` in payload. Language tags are stored lowercase. `EN` updates the `en` row, and a tag that matches the source language in any case is rejected. [`20251109110000_translation_language_case.sql`](../supabase/migrations/20251109110000_translation_language_case.sql).
4. **UI:** [`RecipeLanguageSelector`](../apps/web/components/recipe/recipe-language-selector.tsx), translation list + per-language editor under `…/translations/`.
5. **Seed:** Family A buns include reviewed `en` and unreviewed `uk` sample rows in [`seed-recipes.sql`](../supabase/seed-recipes.sql).
6. **Manual UI playbook:** [`docs/fixtures/UI_TEST_T3_3.md`](fixtures/UI_TEST_T3_3.md).

## EPIC 3.5 — Web MVP product decisions (2026-11-09)

Approved for implementation without re-confirmation:

1. **Membership:** Suspend/reactivate instead of permanent removal; preserve content and audit; never suspend the sole active owner; **owner transfer** in web MVP (transactional, one active owner, former owner → admin).
2. **Member privacy:** Family members see display names and roles only; no cross-member auth email exposure; narrow family-scoped display-name read; neutral translated fallback when name missing.
3. **Search:** Contributor filter via member picker (no UUIDs); translation-language search deferred and documented.
4. **Global preferences (W35.8–W35.9):** Theme and UI locale controls on auth screens, signed-in shell, and account settings; cookie persistence before login; `profiles` sync after login; locale change keeps route; theme without flash.
5. **MCP:** EPIC 4 was out of scope until W35.12; **web gate passed 2026-11-10** — EPIC 4 may proceed; full staging release remains §19.3 / W35.13–W35.17.

## W35.1 — Recipe media upload UI (2026-11-09)

1. **Surfaces:** Upload panel on recipe **detail** and **edit** for people who can edit, including archived recipes. Create flow shows deferred copy until the recipe exists.
2. **Client flow:** [`uploadRecipeAssetFile`](../apps/web/lib/recipe-asset-upload.ts) — slot POST → signed PUT → finalize POST; same APIs as T3.1.
3. **Step photos:** Per-step upload in the editor (`step_photo` kind); `mediaAssetId` is part of the editor draft and persists on recipe save.
4. **i18n:** `recipes.mediaUpload` in all four UI catalogs.
5. **Step link persistence:** [`20251109120000_recipe_step_media_asset.sql`](../supabase/migrations/20251109120000_recipe_step_media_asset.sql) updates `private.recipe_insert_children` so `mediaAssetId` is stored on `recipe_steps.media_asset_id`. The id must be an available `step_photo` image on that same recipe. Anything else raises SQLSTATE `22023`, which the update use case maps to a validation error, and the version does not change. Leaving the field off the next save clears the link. The revision snapshot already stores the step row, so the id is included.
6. **Failed signed PUT:** the browser calls finalize after a failed upload so the pending row is rejected and does not keep one of the 10 slots. The displayed name is the file’s base name with control characters removed; a name the schema would reject is omitted.
7. **Shared limit:** the editor counts assets already on the recipe together with ids uploaded in the current session, including step photos, so the limit is enforced before the route refresh returns.
8. **Unlink:** Removing a step photo clears `mediaAssetId` on the next save. The file stays on the recipe and still counts toward the limit.

## W35.4 — Family member listing (2026-11-09)

1. **RPC** [`list_family_member_directory`](../supabase/migrations/20251109130000_family_member_directory.sql): `SECURITY DEFINER`, caller must be `private.is_active_member`; returns `user_id`, `role`, `status`, and `profiles.display_name` only (no `auth.users` email).
2. **UI:** `/{locale}/f/[familyId]/settings/members` for every active member; shell nav **Members** link. The list is a Server Component. Labels are resolved on the server, and member ids are not rendered.
3. **Labels:** `resolveMemberDisplayLabel` in `packages/domain` — You / display name / translated neutral fallback. Display names are trimmed and capped at 80 characters before they reach the page.
4. **Contributor filter:** recipe browse uses this directory as a member picker. Translation-language search stays deferred.

## W35.8 — Account settings and profile preferences (2026-11-09)

1. **Route:** `/{locale}/account/preferences` — display name, `profiles.preferred_language`, `profiles.theme_preference`; linked from `/{locale}/account`.
2. **Stack:** `updateProfileInputSchema`, data-access `getOwnProfile` / `updateOwnProfile`, application `getOwnProfile` / `updateOwnProfile`; existing `profiles_update_own` RLS.
3. **Cookie sync:** On sign-in only (`ensureProfileForSession` in the auth callback and OTP Server Action — not in Server Components), existing profiles push DB values onto `fc-locale` and `fc-theme`. New profiles still seed from cookies. Account save and signed-in language/theme switchers update both DB and cookies.
4. **Tests:** Vitest for schema bounds, application use cases, and cookie writer; no new pgTAP (own-row policies unchanged).

## W35.9 — Signed-in language/theme controls (2026-11-09)

1. **Component:** [`UiPreferencesControls`](../apps/web/components/preferences/ui-preferences-controls.tsx) composes `LanguageSwitcher` + `ThemeSwitcher` for auth screens, signed-in family shell, account hub, families/onboarding/invite flows, and the public home page. Account **preferences** form remains the detailed editor (no duplicate quick controls there).
2. **Locale change:** `LanguageSwitcher` keeps the current pathname **and query string** when calling `next-intl` `router.replace` ([`localeSwitchTargetPath`](../apps/web/lib/locale-switch-path.ts)) so invitation tokens and other `searchParams` are not dropped.
3. **Theme:** Existing inline `ThemeScript` + `ThemeProvider` handle flash-free appearance; switcher actions persist cookies and signed-in profile rows as in W35.8.
4. **Tests:** Vitest for locale-switch path preservation and four-locale `uiPreferences` catalog completeness.

## W35.12 — Web MVP gate and §19 alignment (2026-11-10)

1. **Backlog:** W35.1–W35.11 acceptance verified; EPIC 3.5 marked complete in [`TASKS.md`](../TASKS.md).
2. **Spec:** [`PROJECT_SPEC.md`](../PROJECT_SPEC.md) §19 split into **19.1 web gate** (met), **19.2 MCP** (EPIC 4), **19.3 full staging release**; §18.5 lists current CI jobs.
3. **CI fix:** Playwright job `runs-on: ubuntu-24.04` — Playwright 1.56.1 does not ship Chromium for Ubuntu 26.04 (`ubuntu-latest` on GHA).
4. **Next:** W35.14–W35.17 and EPIC 4 (MCP) for §19.3 staging release.

## W35.15 — Deployment and environment documentation (2026-11-10)

1. **Guide:** [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) — local vs staging vs production isolation; hosted Supabase Auth URLs + `db push`; web monorepo `pnpm build` / `next start`; env table; no `service_role` on the web host; MCP not deployed.
2. **Vendor:** no vendor-specific deploy files. Any Node 22 + pnpm host that can build from the repo root is acceptable. Exact DNS/SMTP/host accounts are operator-owned (placeholders only).
3. **Smoke:** [`docs/fixtures/STAGING_SMOKE.md`](fixtures/STAGING_SMOKE.md) plus existing invitation checklist. Not executed here (no staging project in this task).
4. **Env:** [`.env.example`](../.env.example) comments point at the matrix; `NEXT_PUBLIC_*` must be present at **build** time.

## W35.14 — Production invitation email (2026-11-10)

1. **Config:** [`parseInvitationSmtpConfigFromEnv`](../packages/application/src/invitations/invitation-smtp-config.ts) reads `INVITATION_SMTP_*`. When `NODE_ENV=production`, loopback hosts and `@family-cookbook.test` senders are rejected; SMTP user + password are required; TLS certificate verification stays enabled for remote hosts ([`invitation-smtp-host.ts`](../packages/application/src/invitations/invitation-smtp-host.ts)).
2. **Transport:** Nodemailer via [`mailpit-smtp-sender.ts`](../packages/application/src/invitations/mailpit-smtp-sender.ts) — local Mailpit keeps `rejectUnauthorized: false` only on loopback; 15s connection/greeting timeouts; optional AUTH for providers; send failures return `smtp_send_failed` without logging message bodies or credentials.
3. **Staging gate:** manual checklist [`docs/fixtures/STAGING_INVITATION_EMAIL.md`](fixtures/STAGING_INVITATION_EMAIL.md).

## W35.13 — Rate limits, headers, CORS, log redaction (2026-11-10)

1. **Package:** [`packages/security`](../packages/security) — in-memory sliding-window rate limits (MVP; edge/redis provider deferred per spec), `redactLogText` / `redactLogFields`, CSP + baseline secure headers, strict credentialed CORS helpers.
2. **Limits:** Auth magic link / OTP (per IP + email), invitation create/accept (per user), upload slot/finalize (per user+family), recipe search (per user) enforced in shared application use cases where applicable; sign-in limits in web Server Actions.
3. **Web:** [`next.config.ts`](../apps/web/next.config.ts) `headers()` + [`proxy.ts`](../apps/web/proxy.ts) apply the same policy; upload API routes return `429` + remaining `Retry-After` and reject disallowed `Origin`; OPTIONS uses an empty 204 (JSON 204 throws in Node). No wildcard credentialed CORS. Dev CSP includes `'unsafe-eval'` and `ws:`/`wss:` so Next/React refresh works; production CSP does not.
4. **Tests:** Vitest in `@family-cookbook/security` and web CORS/origin + 204 helper.

## W35.11 — pgTAP in GitHub Actions (2026-11-10)

1. **CI job:** `pgTAP / RLS` in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — `pnpm supabase:db:start` (Postgres only), `pnpm supabase:reset` (`db reset --yes`), `pnpm supabase:test` (same [`supabase-test.mjs`](../scripts/supabase-test.mjs) docker-exec runner as local).
2. **Postgres-only start:** pgTAP files run as SQL inside `supabase_db_*`; they do not need Auth, PostgREST, Storage API, or Studio. That avoids pulling and health-checking those images on GHA. Playwright E2E still uses `supabase:start:core`.
3. **Scope:** runs in parallel with Quality/Security/E2E (separate runner; no shared Postgres).
4. **Local parity:** `pnpm supabase:reset && pnpm supabase:test` — 20 SQL files under [`supabase/tests/`](../supabase/tests/).

## W35.10 — Playwright critical journeys (2026-11-09)

1. **Auth fixture:** [`seedAuthSession`](../apps/web/e2e/fixtures/auth.ts) signs in seeded personas with `signInWithPassword` + `@supabase/ssr` cookie jars (local password in [`TEST_IDENTITIES.md`](fixtures/TEST_IDENTITIES.md)); tests skip when Supabase is unreachable.
2. **Specs:** [`critical-journeys.spec.ts`](../apps/web/e2e/critical-journeys.spec.ts) covers recipe browse/filters, members/settings/invitations, create recipe, archive restore + upload panel, family switch, and a 360px-style mobile smoke; existing [`sign-in-a11y.spec.ts`](../apps/web/e2e/sign-in-a11y.spec.ts) stays in the suite.
3. **CI:** `Playwright E2E` job — `playwright install --with-deps chromium`, `supabase:start:core`, `supabase:reset`, `supabase:sync-env`, `pnpm build`, `pnpm test:e2e` on port **3099**. Runner is **`ubuntu-24.04`** (not `ubuntu-latest`): Playwright **1.56.1** cannot install Chromium on Ubuntu 26.04. Unpin or upgrade Playwright to **1.61+** when we want 26.04.
4. **Local:** `pnpm test:e2e` runs `pretest:e2e` → `playwright install chromium` (first run downloads browsers). Start Supabase + `pnpm supabase:sync-env` for authenticated journeys; Playwright reuses an existing `pnpm dev:web` on port 3003 when present.

## W35.7 — Family settings (2026-11-09)

1. **Fields:** `families.name` (1–120) and `default_language` (`en`/`fi`/`ru`/`uk`). `created_by` stays fixed via existing RLS `with check`.
2. **Gates:** Owner/admin only (`canChangeFamilySettings` + `families_update_managers`); other roles see read-only values on `/{locale}/f/[familyId]/settings`.
3. **Stack:** `updateFamilyInputSchema`, data-access `updateFamilySettings`, application `updateFamily`; no new RPC—RLS is the boundary.
4. **Tests:** Vitest schema bounds; pgTAP `98_family_settings.sql` for owner/admin/editor and check constraint.

## W35.6 — Owner transfer (2026-11-09)

1. **RPC** [`transfer_family_ownership`](../supabase/migrations/20251109200000_transfer_family_ownership.sql): caller must be active **owner**; demotes current owner to `p_former_owner_role` (default `admin`), then promotes target; demote-first ordering respects the partial unique owner index; audit `family_member.ownership_transferred`.
2. **UI:** Owner-only section on members settings with confirm checkbox, new-owner picker, and optional former-owner role (non-owner roles only).
3. **Application:** `confirm: true` at the contract boundary. An unknown former-owner role is rejected. Permissions `canTransferFamilyOwnership` / `canReceiveFamilyOwnership` run before the RPC. Confirmation errors stay in the dialog.

## W35.3 — Contributor search filter (2026-11-09)

1. **UI:** Recipe browse uses a family member `<select>` (`createdBy` query param) fed by `listFamilyMembers` + `resolveMemberDisplayLabel`. No free-text UUID entry.
2. **API:** Reuses existing `searchRecipes` `createdBy` filter in contracts/data-access; pagination keeps the param via `buildRecipeSearchQuery`.
3. **Deferred:** Filtering by **translation** language (UI locale vs recipe `source_language` vs translation rows) is out of MVP scope; `language` filter remains recipe source language only.
4. **Tests:** Vitest URL helpers in `apps/web`; optional `search-recipes.integration.test.ts` signs in seeded users when local Supabase + `apps/web/.env.local` are available (skipped otherwise).

## W35.2 — Archive and restore UI (2026-11-09)

1. **Where:** recipe detail, for the same people who can edit that recipe. The list keeps the archived badge and the include-archived filter. Archive is not a list-row action, so the confirmation stays on the recipe page.
2. **Archive** sends `confirm: true` and `expectedVersion`. **Restore** sends `expectedVersion` only. Both call the existing use cases.
3. **Conflict:** the message stays inside the archive dialog (or beside restore). The reload control is a full page load, because a client navigation does not refetch `expectedVersion`.
4. A missing recipe is its own message. It is not shown as a generic save failure.

## W35.5 — Member role and suspension (2026-11-09)

1. **RPCs** [`20251109140000_family_member_admin.sql`](../supabase/migrations/20251109140000_family_member_admin.sql) and [`20251109150000_family_member_admin_guards.sql`](../supabase/migrations/20251109150000_family_member_admin_guards.sql): `set_family_member_role` and `set_family_member_status` — owner/admin only; no self-change; owner rows stay immutable until transfer (W35.6); the invitation role matrix is reused; only the owner may change an admin. A row lock serializes concurrent role and status changes. Each real change writes `family_member.role_changed` or `family_member.status_changed` with the target user id and the old and new value, and no email. [`20251109160000_role_check_false_for_non_members.sql`](../supabase/migrations/20251109160000_role_check_false_for_non_members.sql) makes `private.has_family_role` return false when the caller has no active role. A null result used to skip `if not` checks, so a non-member could suspend someone.
2. **Direct updates:** `family_members_update_managers` matches those rules. An admin cannot demote another admin, nobody can edit their own row, identity columns cannot change, and a suspended member keeps their role.
3. **Application:** `setFamilyMemberRole` / `setFamilyMemberStatus` check `@family-cookbook/permissions` before the RPC. The RPC remains the authority.
4. **UI:** owner/admin **Manage roles and access** on the members page. The server decides who can be managed and passes only those people, with role labels as text, into the client forms.
5. **Access:** a suspended user fails `is_active_member` on the next request (pgTAP `96_family_member_admin.sql`).
