# Family Cookbook — Implementation Backlog

Work in order. A task is complete only when its acceptance criteria and relevant tests pass. Keep the sprint focused on the MVP in `PROJECT_SPEC.md`.

## EPIC 0 — Repository and developer workflow

### T0.1 Bootstrap monorepo
- Create pnpm workspace with `apps/web`, `apps/mcp`, and shared packages: `contracts`, `domain`, `permissions`, `application`, `data-access`, `config`.
- Add strict TypeScript, formatter, lint rules, test scripts, and `.env.example`.
- Pin compatible stable dependency versions and commit lockfile.
- Add root scripts for lint, typecheck, test, build, and formatting.

**Acceptance:** clean install works; all workspace packages resolve; lint/typecheck/build scripts run in CI.

### T0.2 CI baseline
- Add GitHub Actions workflow for install, lint, typecheck, unit tests, and web/MCP builds.
- Add secret scanning and dependency audit.

**Acceptance:** workflow passes on clean branch; secrets are not present in repo history or client bundles.

### T0.3 Design system foundation
- Read `DESIGN_SYSTEM.md` and implement semantic design tokens for color, typography, spacing, layout, radii, elevation, focus, and motion.
- Add light/dark theme tokens and a `system` / `light` / `dark` preference provider with no avoidable theme flash.
- Build a small component gallery/design preview showing buttons, form fields, recipe cards, navigation, dialogs, status states, and typography in both themes.
- Set up shadcn/ui only for the primitives actually needed; customize them to the Family Cookbook visual identity.

**Acceptance:** tokens are centralized; no new UI component hard-codes colors; theme switch persists; gallery shows key states in light/dark; UI does not resemble an unmodified shadcn starter.

### T0.4 Internationalization foundation
- Add `next-intl` App Router integration and message catalogs for `en`, `fi`, `ru`, and `uk`.
- Add locale routing/detection/fallback and a visible language switcher.
- Add profile `preferred_language` and `theme_preference` migration fields; keep recipe language metadata separate.
- Localize one representative page and validation/error messages to prove server/client message usage.

**Acceptance:** switching across all four locales updates UI copy on the representative flow; date/number/plural formatting follows locale; Ukrainian Cyrillic glyphs render correctly; unsupported locale falls back safely; no user-facing strings are hard-coded in that flow.

## EPIC 1 — Supabase, tenant model, and identity

### T1.1 Local Supabase setup
- Add local Supabase configuration and documented commands.
- Add seed fixtures for two families and users/roles for tests (never production data).
- Add migration reset/apply workflow.

**Acceptance:** new developer can start local stack from documented steps; migrations apply from empty database.

### T1.2 Base schema and RLS helpers
- Implement profiles, families, family_members, family_invitations and enums.
- Add safe role/membership helper functions with fixed search path and narrow grants.
- Enable RLS and write explicit select/insert/update/delete policies.
- Add indexes and integrity constraints, including exactly one active owner per family.

**Acceptance:** pgTAP proves cross-family isolation, role restrictions, and owner uniqueness. No exposed table is left without reviewed RLS.

### T1.3 Authentication and profile bootstrap
- Implement Supabase email OTP/magic-link sign-in, callback, logout, session refresh.
- Implement server/client Supabase factories using the documented SSR approach, isolated behind data-access package.
- Create/update profile from verified auth identity without trusting browser-supplied user ID.

**Acceptance:** browser session is cookie-based and refresh works; no auth token is put in localStorage by app code; protected server routes reject anonymous requests.

**Status:** Done (2026-11-07).

### T1.4 Family lifecycle and selection
- Implement create family + initial owner membership as one transaction.
- Implement list memberships and family switcher.
- Store last-selected family as a preference only; every data call still checks membership.

**Acceptance:** a user can own/join multiple families; family A data is not visible in family B context.

**Status:** Done (2026-11-07).

### T1.5 Invitation flow
- Implement invitation create/revoke/accept use cases.
- Hash random invitation token before storage; expiry 7 days; one-time atomic redemption; verified email match.
- Add email adapter and local development mode.

**Acceptance:** expired, revoked, replayed, wrong-email and concurrent redemption attempts fail safely; role assignment restrictions pass tests.

**Status:** Done (2026-11-07).

## EPIC 2 — Recipe domain and core UI

### T2.1 Recipe schemas and aggregate model
- Add shared Zod schemas for recipe create/update, ingredients, steps, tags, translations, and search filters.
- Add domain types and role capability matrix.

**Acceptance:** boundary schemas reject invalid lengths, counts, negative time/servings, and malformed language tags.

**Status:** Done (2026-11-07).

### T2.2 Recipe database schema
- Implement recipes, ingredients, steps, family tags, recipe tags, translations, revision snapshots, audit events.
- Add composite family foreign keys, RLS, constraints, search indexes.

**Acceptance:** a child row cannot reference a parent from another family; RLS tests cover every new table.

**Status:** Done (2026-11-08).

### T2.3 Shared application use cases
- Implement `createRecipe`, `getRecipe`, `searchRecipes`, `updateRecipe`, `archiveRecipe`, `restoreRecipe`, and `getRecipeHistory`.
- Use request-scoped user-bound repository.
- Make aggregate write + version bump + revision + audit atomic.
- Add optimistic concurrency with `expected_version`.

**Acceptance:** web-independent unit/integration tests prove role rules, ownership rules and version conflict behavior.

**Status:** Done (2026-11-08).

### T2.4 Web dashboard and recipe browsing
- Build family dashboard, family selector, recipe list, filters, pagination, and recipe detail.
- Use Server Components for protected reads; add Client Components only for interaction.
- Follow custom product patterns in `DESIGN_SYSTEM.md`; build for mobile first and review light/dark states.

**Acceptance:** mobile layout works at 320px/360px; loading/empty/error/forbidden states exist; searches are family-scoped; keyboard operation and automated accessibility checks pass.

**Status:** Done (2026-11-08).

### T2.5 Recipe editor
- Build create/edit form with dynamic ingredients and ordered steps.
- Add servings, timings, category, notes, tags, source language.
- Preserve form content on validation errors.
- Use plain-language labels, visible field hints, keyboard-friendly controls, and a single-column mobile layout.

**Acceptance:** authorized member can create and update; Viewer cannot; Contributor cannot update another person's recipe; stale update returns conflict; form is keyboard accessible and usable at 320px/360px/200% zoom.

**Status:** Done (2026-11-08).

### T2.6 Revision history and audit UI
- Show revision list and change metadata to authorized roles.
- Ensure audit events omit sensitive content.

**Acceptance:** each successful recipe mutation creates exactly one revision and audit event; failed mutation creates neither.

**Status:** Done (2026-11-08).

## EPIC 3 — Media, localization, and search

### T3.1 Private storage and upload workflow
- Create private bucket and storage policies.
- Implement upload slot, generated object path, size/type allowlist, finalization, signature validation, checksum and asset status.
- Limit to JPEG, PNG, WebP (15 MiB) and PDF (25 MiB); max 10 assets per recipe.

**Acceptance:** unsupported, oversized, spoofed, or unauthorized uploads fail; asset reads require family membership and available asset record.

**Status:** Done (2026-11-08).

### T3.2 Media display
- Add recipe photo/source gallery and authorized short-lived signed URLs.
- Serve PDF as attachment by default; do not render arbitrary content inline.
- Preserve originals; optionally make sanitized image derivatives.

**Acceptance:** original asset remains intact and private; signed URLs are generated only after permission checks and are not persisted/logged.

**Status:** Done (2026-11-09).

### T3.3 Manual translations
- Implement recipe/ingredient/step translations and review status.
- Add translation selector in detail screen.

**Acceptance:** original recipe never changes when translation is added; translations can be reviewed/edited independently.

**Status:** Done (2026-11-09).

### T3.4 Search improvements
- Implement indexed title/description and ingredient search, categories, tags, language, contributor filters.
- Add stable pagination and query bounds.

**Acceptance:** supported filters work with representative fixtures; result set never leaks across families; max page size enforced.

**Status:** Done (2026-11-09).

## EPIC 3.5 — Web MVP completion (before MCP)

Complete the family-facing web application per approved product decisions (member suspension, owner transfer, contributor search picker, global theme/locale). **MCP (EPIC 4) is out of scope** until W35.12 passes.

**Status:** Web gate complete (2026-11-10). EPIC 4 may start; W35.13–W35.17 cover production hardening before §19.3 staging release.

### W35.1 — Recipe media upload UI
- Recipe edit and detail surfaces for authorized editors: upload recipe photos, original scans (PDF), and step photos; client flow uses existing slot → signed PUT → finalize APIs.
- Show limits (10 assets/recipe, MIME/size allowlist), progress/status, and errors in all four UI locales.
- Step photo upload sets `mediaAssetId` on the step draft; saving the recipe persists the link.
- Create-recipe flow explains that media is added after the first save.

**Tests:** Vitest for client upload helpers, filename cleanup, and step-link mapping; pgTAP that a save stores `media_asset_id` and rejects another recipe’s asset; manual/API parity with `docs/fixtures/API_TEST_T3_1.md`; forbidden role cannot upload.

**Status:** Done (2026-11-09).

### W35.2 — Archive and restore UI
- Archive/restore actions on recipe detail (and list where appropriate) with `confirm: true` / version checks per existing use cases.
- Archived badge and list filter behavior unchanged; restore returns recipe to active browsing.

**Tests:** Vitest form mapping for confirm and version; pgTAP role rules unchanged; Playwright journey (W35.10).

**Status:** Done (2026-11-09).

### W35.3 — Search filters and integration tests
- Family member picker for **contributor** filter (no UUID entry); wire to existing search API.
- Document translation-language search as deferred.

**Tests:** Application/data-access integration tests with local Supabase; UI filter e2e in W35.10.

**Status:** Done (2026-11-09).

### W35.4 — Family member listing
- Family-scoped member list with display name (or neutral fallback) and role; never expose auth emails to other members.

**Tests:** RLS/pgTAP for member visibility; Vitest for display-name resolver.

**Status:** Done (2026-11-09).

### W35.5 — Role management, suspension and reactivation
- Owner/Admin change roles within matrix; suspend/reactivate members; block suspending the sole active owner.
- Preserve history and authorship.

**Tests:** Transactional DB functions + pgTAP for suspension access loss and reactivation; concurrent role-change cases.

**Status:** Done (2026-11-09).

### W35.6 — Owner transfer
- Owner-only transfer UI; atomic transfer (exactly one active owner; former owner → admin).

**Tests:** pgTAP owner invariants; negative cases (non-owner, suspended target).

**Status:** Done (2026-11-09).

### W35.7 — Family settings
- Edit family name, default recipe language, and related settings per spec; owner/admin gates.

**Tests:** Vitest + pgTAP for family update policies.

**Status:** Done (2026-11-09).

### W35.8 — Account settings and profile preference persistence
- Profile display name, `preferred_language`, `theme_preference`; sync cookies ↔ profile after auth.

**Tests:** Vitest; persistence across session refresh.

**Status:** Done (2026-11-09).

### W35.9 — Signed-in language/theme controls
- Accessible theme (system/light/dark) and language (en/fi/ru/uk) on auth screens, app shell, and account settings; no route loss on locale change; no theme flash.

**Tests:** Component/integration tests; four locales and both themes on critical routes.

**Status:** Done (2026-11-09).

### W35.10 — Playwright critical journeys
- Auth, family switch, recipe CRUD, upload, archive/restore, members, invitations, settings, search, mobile viewport; fix Chromium install in CI.

**Tests:** Playwright suite green in GHA.

**Status:** Done (2026-11-09).

### W35.11 — pgTAP in GitHub Actions
- Run `pnpm supabase:test` (or equivalent) in CI with local Supabase/Docker.

**Tests:** Workflow job passes on clean branch.

**Status:** Done (2026-11-10).

### W35.12 — Complete web MVP and reconcile backlog
- Mark EPIC 3.5 tasks done only when acceptance criteria verified; update `PROJECT_SPEC` §19 alignment; defer MCP.

**Tests:** Full CI (lint, typecheck, unit, build, pgTAP, Playwright smoke).

**Status:** Done (2026-11-10).

### W35.13 — Rate limiting and secure headers
- Rate limits for login, invitation, upload, search; secure headers, CORS, log redaction per T5.1 scope.

**Tests:** Automated security cases from spec §17.3 where applicable.

**Status:** Done (2026-11-10).

### W35.14 — Production invitation email
- Production-safe email adapter (no local SMTP assumptions).

**Tests:** Staging send with test inbox; no secrets in logs.

**Status:** Done (2026-11-10).

### W35.15 — Deployment and environment documentation
- Staging/production Supabase, secrets, web deploy, env examples.

**Tests:** Staging smoke documented and repeatable.

**Status:** Done (2026-11-10).

### W35.16 — Backup and restoration verification
- Backup schedule and documented restore drill.

**Tests:** Recorded restore verification.

**Status:** Done (2026-11-10).

### W35.17 — Accessibility release review
- axe + manual keyboard/screen-reader pass on critical flows; WCAG 2.2 AA exceptions documented.

**Tests:** Automated axe in CI; checklist in release notes.

**Status:** Done (2026-11-10).

**Note:** W35.12 marked backend signed-in flows and test harness complete; product-facing landing, shell, and cook-first layout are tracked in EPIC 3.6.

## EPIC 3.6 — Product face (local family testing)

### W36.1 — Profile before create family
- Call `ensureProfile` inside shared `createFamily` before family bootstrap; pass cookie hints from web action.

**Acceptance:** onboarding create-family works without visiting Account first; application test proves profile runs before RPC.

**Status:** Done (2026-11-10).

### W36.2 — Dashboard and shell copy
- Replace engineering dashboard “tenant scope” strings in all UI locales; compact family header with skip link.

**Acceptance:** no rental-tenant wording; single-family switcher does not duplicate the family name; skip link targets `#family-main`.

**Status:** Done (2026-11-10).

### W36.3 — Public landing and metadata
- Signed-out home is editorial cookbook welcome; localized `meta` title/description via `generateMetadata` and `DocumentLangSync`.

**Acceptance:** no bootstrap demo JSON or contracts block on home; description is cookbook copy in each locale.

**Status:** Done (2026-11-10).

### W36.4 — Cook-first recipe detail
- Recipe reading before upload/admin chrome; media gallery after ingredients/steps.

**Acceptance:** viewers never see upload panel; on narrow viewports title and ingredients precede upload UI.

**Status:** Done (2026-11-10).

### W36.5 — Reconcile backlog note
- Document EPIC 3.6 scope; defer PPR duplicate IDs, list thumbnails, and MCP to follow-up epics.

**Acceptance:** `DECISIONS.md` records scope boundary.

**Status:** Done (2026-11-10).

## EPIC 3.7 — Product shell and cookbook UX (pre-MCP)

Cohesive navigation, compact preferences, photo-led browse, and polish from the UI/UX audit. Completes P0 shell work before EPIC 4; P1/P2 may continue alongside MCP.

### UI-01 — App shell and navigation
- `FamilyAppShell`, `PrimaryNavigation`, `MobileNavigation`, sticky header, account menu.

**Status:** Done (2026-11-10).

### UI-02–UI-06 — Preferences, active nav, auth CTA, switcher id
- Compact signed-in prefs in account menu; auth footer prefs; landing sign-in button; `#family-shell-switcher`.

**Status:** Done (2026-11-10).

### UI-04 — Collapsible recipe filters and chips
- Mobile-collapsible filter panel; active filter chips.

**Status:** Done (2026-11-10).

### UI-07–UI-08 — Recipe cards and list thumbnails
- Gallery-style cards, responsive grid; `coverAssetId` on summaries from search.

**Status:** Done (2026-11-10).

### UI-09–UI-12 — Detail, language UI, editor sticky save
- Detail hero image; segmented translation selector; translation index hierarchy; sticky save bar.

**Status:** Done (2026-11-10).

### UI-13–UI-16 — Family and dashboard
- Member admin in `<details>`; dashboard de-emphasizes stats; settings subnav chips.

**Status:** Done (2026-11-10).

### UI-14–UI-22 — Component polish
- `TextLink`, button `link`/`loading`, `FormField`, `Skeleton`, dropdown menu primitive.

**Status:** Done (2026-11-10).

**MCP gate:** EPIC 4 may start after EPIC 3.7 P0; remaining visual QA tracked in W35.17 / release checklist.

**Follow-up (2026-11-10):** fixed save bar, stable dish-photo covers, thumbnail error state, contributor and sort chips, compact family switcher, mobile recipe actions, collapsible editor sections, reading width, `TextLink` sweep, `FormField` on the control, save notice, skeleton loading, and card prep/cook/servings. See `docs/DECISIONS.md` EPIC 3.7.

## EPIC 3.8 — Ready for the family (web UX before real use)

Audit of 2026-11-16 (code review + Playwright screenshots of `main` at 360px/1280px, light/dark, `ru`). Findings and scope boundary: [`docs/DECISIONS.md`](docs/DECISIONS.md) "EPIC 3.8 — scope". Screenshot reference: [`docs/fixtures/ui-baseline/README.md`](docs/fixtures/ui-baseline/README.md).

Measured on `main` before this epic: Home has no highlighted nav item; no page inside the family shell has an `<h1>`; Members scrolls sideways at 360px.

**Execution order:** one task per session, on its own branch `w38-<n>`.
1. P0: W38.0 → W38.1 → W38.2 → W38.3 → W38.4
2. P1: W38.19 → W38.13 → W38.14 → W38.6 → W38.15 → W38.16 → W38.5 → W38.17 → W38.7 → W38.18 → W38.8
3. P2: W38.9 → W38.10 → W38.11 → W38.12
4. Then resume EPIC 4 at T4.2.

W38.14 and W38.5 share `listFamilyCategories`; whichever runs first adds it. W38.7 role descriptions are reused by W38.17.

### Rules for every EPIC 3.8 task
- Read `AGENTS.md`, `apps/web/AGENTS.md` (Next.js 16: read `apps/web/node_modules/next/dist/docs/` before using an unfamiliar API), `DESIGN_SYSTEM.md`, this task, and the EPIC 3.8 entry in `docs/DECISIONS.md`. Inspect the named files and their tests before editing.
- All user-facing copy in `apps/web/messages/{en,fi,ru,uk}.json`. Semantic tokens only, no raw colours. 44px primary targets. Check 320px/360px and both themes.
- Server Components pass `locale` explicitly: `getTranslations({ locale, namespace })`.
- No permission logic in client components; the server decides what a role may see or do. RLS stays authoritative.
- After changing `packages/*`, rebuild and restart `pnpm dev:web`.
- Finish with `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @family-cookbook/web build`; add `pnpm supabase:reset && pnpm supabase:test` if a migration or seed changed, and `pnpm test:e2e` for changed UI journeys. Re-run the screenshot spec (from W38.0) and look at the 360px and 1280px images of every changed page.
- Report: summary, files changed, commands run with results, what was not run, open issues. Set `**Status:** Done (date)` here. Stop at any approval boundary named in the task.

### P0 — navigation and consistency

### W38.0 — Clean data and screenshot baseline
- **Approval boundary:** `pnpm supabase:reset` wipes the local database — ask the user first.
- Extend `supabase/seed-recipes.sql` so Family A has ~8 realistic recipes: real titles, categories, tags, servings, prep/cook times, ingredients with numeric `quantity` + `unit` (not text in `quantity_text`), steps; recipe text written in its declared language, at least one each in `fi`, `ru`, `uk`; one with a translation. Rename "Family A filler recipe n" to plausible dish names, keeping IDs and the 30 active + 1 archived pagination fixture. Update `docs/fixtures/TEST_IDENTITIES.md`.
- `apps/web/e2e/critical-journeys.spec.ts`: recipes created by tests are archived in cleanup, and the archived fixture is re-archived if a test restores it, so manual testing in Family A stays clean.
- Add `apps/web/e2e/screenshots.spec.ts`, excluded from CI and default runs (tag + `grepInvert`, or a separate Playwright project run by `pnpm --filter @family-cookbook/web test:screens`). Use `loginAs`. Full-page JPEGs of the routes in `docs/fixtures/ui-baseline/README.md` at 360px and 1280px, light and dark, as `owner-a` and `viewer-a`, into a gitignored folder. Also write a JSON summary per page: `h1` count, visible `nav [aria-current="page"]` labels, horizontal overflow.
- Give 3–4 seeded recipes a dish photo through the normal slot → PUT → finalize flow in a setup script (no direct storage-row writes); small CC0/self-made images committed under `supabase/seed/`.

**Acceptance:** Home and Recipes show real-looking recipes, some with photos; summary JSON produced; pgTAP and Playwright pass with the new seed.

**Status:** Done (2026-11-17). pgTAP 175/175, application tests 51/51 including the 30-recipe integration count, Playwright 11/12 on the first run: the intermittent family-switch failure was already on `main` and is assigned to W38.1. `pnpm test:screens` 12/12.

### W38.0a — Restore green checks on `main`
The MCP commit `ff28db0` left four checks failing before EPIC 3.8 started.
- Web build: `/oauth/consent` read cookies, search params and auth outside `<Suspense>` (Next.js 16 prerender error). The page now renders that content inside `<Suspense>`, like other pages. The consent and authorization flow is unchanged. Its hard-coded "Home" link uses `notFound.home`.
- `format:check`: Prettier applied to 12 MCP files, the consent page and `scripts/oauth-pkce-smoke.mjs`. `.prettierignore` now excludes `apps/web/screenshots` (W38.0 output).
- MCP lint: two unused imports removed.
- MCP integration test: searching a family the user does not belong to now expects `FORBIDDEN`, matching the shared use case and the web test. Before, it expected an empty list.

**Status:** Done (2026-11-17). Format, lint, typecheck, all unit tests, full build, client-bundle scan and Playwright 12/12 pass.

### W38.1 — Home in navigation and a clear active state
- `apps/web/lib/family-shell-nav.ts`: sections `home` (`/f/{id}`), `recipes`, `family`; `other` highlights nothing.
- `components/shell/primary-navigation.tsx`, `mobile-navigation.tsx`: items Home (`Home` icon) · Recipes · Family (`Users` icon). Mobile: Home · Recipes · Add recipe (only if allowed; otherwise not rendered) · Family. "Add recipe" is a normal item with a green icon circle, not a wide filled block.
- Active style: desktop filled `bg-primary text-primary-foreground` pill; mobile top indicator bar + bold label + primary colour (not colour alone). Keep `aria-current="page"`.
- Logo links to Home. Message keys: rename `family.shell.settings` → `family.shell.family`, add `family.shell.home` (four locales).
- `components/shell/family-settings-subnav.tsx`: same active treatment; fix the 360px page overflow on Members (chips wrap or scroll inside their own container).
- `components/shell/account-menu.tsx`: first item labelled with `account.title` (not `account.signedInAs`); theme options laid out cleanly (one row or all stacked); show the "Account" text on the trigger when width allows, accessible name always.
- Fix the family switcher: after switching, the document holds two `#family-shell-switcher` selects and `e2e/critical-journeys.spec.ts` "multi-family member switches workspaces" fails intermittently (against `next dev`: 3 of 3 runs, later 1 of 5; already on `main` before W38.0, so a race rather than a constant failure). Exactly one switcher must exist after the redirect.

**Tests:** extend `lib/family-shell-nav.test.ts`; Playwright asserts exactly one `aria-current="page"` in the primary nav on Home, Recipes, recipe detail, edit, settings, members, invitations (desktop and mobile); no horizontal overflow at 320px; contrast of new active styles in both themes.

**Status:** Not started.

### W38.2 — One page header and one shell everywhere
Split into two sessions if large: (a) PageHeader + family pages, (b) account/auth shells.
- New `components/product/page-header.tsx`: `<h1>` in the serif display font, optional description, optional back link (always above the title), optional actions slot; one size scale (`text-2xl sm:text-3xl`).
- Use it on: family home, recipes list (replace `RecipesHeader`), recipe detail (recipe title becomes the `h1`; inner headings shift up one level), new/edit/history/translations, settings, members, invitations. Remove the bottom "Back to dashboard/home" links.
- Account area (`/account`, `/account/preferences`, `/families`): shared shell with the same sticky header (logo → `resolveSignedInLandingPath`, `AccountMenu`), `max-w-3xl`, top-aligned (no vertical centring). Merge account and preferences into one "Account" page (name, email in normal type, language, theme, sign out); `/account/preferences` redirects to it.
- Signed-out pages (home, sign-in, onboarding, invite accept) share one `AuthShell` (logo, content column, footer preferences).
- One `LoadingState` component replacing per-page pulse placeholders.

**Tests:** Playwright: every signed-in route has exactly one `h1` and a visible link to Recipes; axe on changed routes; no overflow at 320px. Update existing e2e selectors that depended on old headings.

**Status:** Not started.

### W38.3 — Sign-in by code, link as a fallback
- **Approval boundary:** Supabase Auth email template change (local now; hosted projects need the same change by the user).
- `components/auth/sign-in-form.tsx`: two steps. Step 1: email + "Email me a sign-in code". Step 2: "We sent a message to {email}", large 6-digit field (numeric keyboard, paste, auto-submit at 6 digits), "or open the link in the email", "Use a different email", resend with countdown. Focus moves to the code field; status announced via `role="status"`.
- Add `supabase/templates/magic_link.html` with both `{{ .Token }}` and the confirmation link; wire `[auth.email.template.magic_link]` in `supabase/config.toml` (restart stack). Update `docs/LOCAL_SUPABASE.md`, `docs/DEPLOYMENT.md` (hosted template step), DECISIONS T1.3 item 6.
- Plain-language copy in four locales (no "magic link").
- No change to session handling, redirect sanitising (`sanitizeAuthRedirect`) or rate limits.

**Tests:** Playwright signs in with the code read from Mailpit (`http://127.0.0.1:54324/api/v1/messages`); link journey still works; invalid/expired code and rate-limit messages shown; axe on sign-in.

**Status:** Not started.

### W38.4 — Cyrillic body font
- `apps/web/app/layout.tsx`: add the `cyrillic` subset to the sans font if `next/font/google` supports it for Geist (check generated types); otherwise switch the sans token to a family with Latin + Cyrillic coverage. Keep the `--font-sans` token name.
- Verify і ї є ґ and Finnish diacritics in the design gallery (`/uk/design`, `/fi/design`). Update DECISIONS T0.3 item 7 and `DESIGN_SYSTEM.md` §2 decision note.

**Tests:** build; screenshot comparison of `ru`/`uk` pages.

**Status:** Not started.

### P1 — clarity and guidance

### W38.19 — Recipe cards that work without photos
- `components/recipe/recipe-card.tsx`, `recipe-card-cover.tsx`, `recipe-list.tsx`.
- With a photo: cover at fixed 4:3. Without a photo: no tall empty block — small tinted square with category initial/icon beside the text.
- Phones (<640px): compact horizontal rows (72–88px thumbnail left, text right), 5–6 per screen. Grid with covers from `sm` up.
- Meta: omit zero/missing values (no "0 min cook"); show total time; "Updated" shows date only (relative within a week).
- Home shows at most six recent recipes using the same card.

**Tests:** Vitest for the meta formatter; Playwright at 360px: at least four recipe cards above the fold on Recipes; axe.

**Status:** Not started.

### W38.13 — Language names, not codes
- `apps/web/lib/language-label.ts` using `Intl.DisplayNames(uiLocale, { type: 'language' })`, raw tag as fallback.
- Use it in recipe detail facts, `recipe-language-selector.tsx` ("Original — Finnish"), translations pages ("Add Ukrainian"), editor source-language select, family settings, search filter and chips.
- Hide the view-language selector when a recipe has no translations.

**Tests:** Vitest for the helper in all four UI locales and an unknown tag.

**Status:** Not started.

### W38.14 — Search-first recipe browse
- `components/recipe/recipe-search-form.tsx`: one large always-visible search field with icon and a primary "Search" button. It matches title, description and ingredient names. If the search contract cannot OR `query` and `ingredient`, add an `anyText` filter to the shared Zod contract and data-access query (family-scoped, same length bounds and indexes) and use it here.
- "Filters" button reveals the rest, collapsed by default on all widths: category and tag as selects of values the family actually uses (`listFamilyCategories` — distinct non-null categories, family-scoped, max 50 — and the existing family tags), language as a select of languages used (names from W38.13), author, sort, show archived.
- Category chips under the search field for one-tap browsing. Keep URL params and active-filter chips. Show a result count. Empty result offers "Clear filters".

**Tests:** update `recipe-search-params` / `build-recipe-search-query` tests; contract tests for any new filter bounds; data-access integration test for combined text search including cross-family isolation; Playwright search journey.

**Status:** Not started.

### W38.6 — Recipe detail readability
- Actions: "Edit" is the one visible button on all widths; History, Translations, Print (W38.12) and Archive go into a "More" menu.
- Facts as one row with icons + text: "Prep 20 min · Cook 45 min · Total 1 h 5 min · Serves 4" (ICU plurals, shared duration formatter in `lib/format-recipe-meta.ts`).
- Show "Added by {name}" and "Updated {date}" via `resolveMemberDisplayLabel`; never email.
- Ingredients as one list: amount + unit in a fixed left column, name right; no bordered card per ingredient.
- After creating a recipe, land on its detail page with a visible "Add photos" prompt (replaces the easy-to-miss note on the create form).

**Tests:** Vitest for duration formatting (incl. hours, missing values, four locales); Playwright detail + create journey; axe.

**Status:** Not started.

### W38.15 — Lighter recipe editor
- `components/recipe/ingredient-list-editor.tsx`, `step-list-editor.tsx`, `lib/recipe-editor/*`.
- One row per ingredient: Amount (single text field) · Unit (`<datalist>` of common units per locale) · Ingredient; "Add note" reveals notes. On phones the row wraps to two lines.
- `lib/recipe-editor/map-payload.ts` + `parse-numbers.ts`: `2`, `1.5`, `1,5`, `1/2`, `1 1/2` → `quantity`; anything else (`to taste`) → `quantityText`. Existing rows load back into the single field. No contract or schema change.
- "Add several at once": textarea, one ingredient per line.
- Reorder with arrow icon buttons that keep accessible names; "Remove" button.
- Steps: numbered; step time and step photo behind "More options".
- Category field with `<datalist>` of family categories.
- Edit page order: basics → ingredients → steps → details (servings, times, category, tags, notes) → photos. Keep the fixed save bar and value preservation on errors.

**Tests:** Vitest mapping/parsing round-trips; Playwright create/edit at 360px; axe.

**Status:** Not started.

### W38.16 — One-step photo upload
- `components/recipe/recipe-media-upload-panel.tsx`, `recipe-step-photo-upload.tsx`: native input hidden behind localized buttons "Add photo" and "Add scan or PDF" (replaces the file-type select); upload starts on selection; thumbnail preview, progress and result announced in a live region. On touch devices an extra "Take photo" button (`capture="environment"`); the normal picker is always available.
- No change to slot → signed PUT → finalize, MIME/size limits, asset kinds or server validation.

**Tests:** Vitest for helpers; Playwright upload journey (photo + PDF, oversize error); axe.

**Status:** Not started.

### W38.5 — Home that helps
- `app/[locale]/f/[familyId]/page.tsx`: greeting with family name; search field submitting to `/recipes?query=`; "Add recipe" (if `canCreateRecipe`); recent recipes (W38.19 cards); category chips linking to filtered browse (`listFamilyCategories`).
- Empty cookbook: `EmptyState` with numbered steps (add first recipe → add a photo → invite family), each a button, shown only for roles that can do them.

**Tests:** Playwright empty and populated Home for owner and viewer; axe.

**Status:** Not started.

### W38.17 — Calmer confirmations, history, members, translations
- Archive dialog: remove the checkbox; dialog text states the consequence; the "Archive" button confirms (still sends `confirm: true` + `expectedVersion`). Archive uses the secondary style; `destructive` only for irreversible actions. Update DECISIONS W35.2 and `recipe-lifecycle-form` tests.
- History: one "Changes" timeline; the audit list only for owner/admin, collapsed, titled "Activity log".
- Members: one list; each row name, role as plain text, status. Owner/admin see "Change" on manageable rows → dialog with role select (role descriptions from W38.7) and suspend/reactivate. Remove the duplicate "Roles and access" cards. The server still computes which members are manageable.
- Translations page: one explanation line; existing translations as rows with "Edit"; one "Add translation" button opening a language select.

**Tests:** Vitest form mapping; pgTAP unchanged and passing; Playwright archive/restore, member role change, translation add; axe.

**Status:** Not started.

### W38.7 — Short contextual tips
- `components/product/hint.tsx`: inline help text plus optional "What is this?" `<details>`; no hover-only tooltips.
- Use for: role descriptions under role selects (invite form, member change dialog); source language vs translation in the editor; amount examples ("2", "1/2", "to taste"); archive vs delete.

**Tests:** axe; locale completeness.

**Status:** Not started.

### W38.18 — Plain-language copy pass
- Replace engineering terms in all four catalogs: workspace/пространство/робочий простір, isolated/изолированы, session/сеанс, context, tenant. Account card "Your details". Read every string as a non-technical relative would. Keep keys stable.

**Tests:** locale completeness tests; e2e selectors updated where text changed.

**Status:** Not started.

### W38.8 — Leave family and clear no-access pages
- **Approval boundary:** new RPC + membership status change touch authorization. Present the migration design (status value, RPC rules, audit event, RLS effect) to the user before writing it.
- `leaveFamily` application use case + RPC: a member removes their own active membership; the sole owner is blocked with a pointer to ownership transfer; audit event without email. UI on the Family page with an explicit confirmation.
- `UnavailablePage`: distinct copy for suspended, not a member, and not found.

**Tests:** pgTAP (leave, sole-owner block, access lost on next request, cross-family); application unit tests; Playwright leave journey.

**Status:** Not started.

### P2 — cooking features

### W38.9 — Serving scaler
- Pure `scaleIngredientQuantity(quantity, baseServings, targetServings)` in `packages/domain`; numeric quantities only; `quantityText` unchanged; friendly rounding (fractions for small kitchen amounts).
- Detail page stepper (− / value / +, "Reset to original"), `?servings=` URL param, note "Scaled from {n} servings". Stored recipe never changes (spec §8.3).

**Tests:** Vitest rounding/passthrough/edge cases; Playwright stepper; axe.

**Status:** Not started.

### W38.10 — Cook mode
- "Start cooking" on detail → `?cook=1`: chrome hidden, larger type, ingredient checkboxes, one highlighted step with Previous/Next buttons, Screen Wake Lock (`navigator.wakeLock`, feature-detected, released on exit/visibility change). State is local only. Reduced motion respected; keyboard operable; Escape exits.

**Tests:** Playwright navigation and exit; axe.

**Status:** Not started.

### W38.11 — Favourites
- **Approval boundary:** new table and RLS — present the migration to the user before applying.
- Migration `recipe_favorites (family_id, recipe_id, user_id, created_at)`, PK `(recipe_id, user_id)`, composite family FK to recipes, RLS: active members read/insert/delete only their own rows in their families. Not a recipe mutation (no revision/version bump).
- Contract + use cases: `setRecipeFavorite`, `favoritesOnly` search filter, `isFavorite` on summaries/detail.
- UI: toggle with text label on detail and cards; "Favourites" chip on browse and Home.

**Tests:** pgTAP (own rows only, cross-family, cross-user, viewer allowed, suspended denied); application tests; Playwright toggle + filter.

**Status:** Not started.

### W38.12 — Print and documentation cleanup
- `@media print` rules in `apps/web/app/globals.css` (hide shell, nav, actions; single column; ink on white); "Print" in the detail "More" menu.
- Docs: `PROJECT_SPEC.md` §19.2 status, `docs/MCP_HANDOFF.md` status table, T5.2 "four initial locales", status lines for T0.1–T1.2, dead `docs/MCP.md` link in `docs/MCP_ROADMAP.md`.

**Tests:** manual print preview; format check.

**Status:** Not started.

## EPIC 4 — MCP service and OAuth

### T4.1 MCP service bootstrap
- Add Node/Hono app using official MCP TypeScript SDK v2 and Streamable HTTP.
- Add `/health` and MCP endpoint; verify target host supports transport behavior.

**Acceptance:** a local MCP test client can initialize and list tools over HTTP.

### T4.2 OAuth staging proof
- Enable/configure Supabase OAuth 2.1 Server in a non-production project.
- Configure asymmetric signing keys, authorization/consent UI, exact redirect handling and client registration policy.
- Test discovery, PKCE, token issuance, token validation, expiry, revocation behavior, and at least one target MCP client.

**Acceptance:** no token bypass; client consent is explicit; failures are documented. If beta behavior is insufficient, stop and propose an alternate authorization provider rather than weakening checks.

### T4.3 Request-scoped MCP authentication
- Validate bearer token signature/issuer/audience/time claims using JWKS and provider configuration.
- Build request-scoped user-bound data client.
- Propagate authenticated actor + OAuth client ID into use cases.

**Acceptance:** invalid, expired, wrong-issuer and wrong-audience tokens are rejected; service-role key is not used for user operations.

### T4.4 MCP tools
- Implement `list_my_families`, `search_recipes`, `get_recipe`, `create_recipe`, `update_recipe`, `archive_recipe`, `restore_recipe`, `get_recipe_history`.
- Use shared Zod contracts; explicit `family_id`; limit outputs; map safe errors.
- Require `confirm: true` for archive; require `expected_version` for update/archive/restore.

**Acceptance:** positive and negative tool tests match web permission matrix; tool writes create the same revision/audit records as web.

### T4.5 MCP integration documentation
- Document endpoint, client config examples, OAuth setup, limitations, revocation and troubleshooting.

**Acceptance:** a developer can connect a supported MCP client by following docs without using a shared static token.

## EPIC 5 — Hardening and release

### T5.1 Security hardening
- Add rate limits for login, invitation, upload, search, and MCP.
- Add secure headers, strict CORS/origin, log redaction, upload controls, error mapping.
- Run cross-tenant and role-escalation test suite.

**Acceptance:** all critical security cases in PROJECT_SPEC section 17.3 pass.

### T5.2 Mobile/accessibility/localization review
- Review 320px, 360px, tablet, and desktop layouts, plus 200% text zoom.
- Verify keyboard flow, visible focus, accessible labels/errors, 44px primary touch targets, reduced motion, and status announcements.
- Run automated axe checks on critical routes and manually test at least one screen-reader/browser combination.
- Verify all three initial locales, long translated strings, language metadata, date/number/plural formatting, and missing-key behavior.
- Verify system/light/dark settings and all interactive states in both themes.

**Acceptance:** critical flows are usable by keyboard and screen reader, reflow at 320px, support 200% text zoom, satisfy reviewed WCAG 2.2 AA criteria, and behave correctly in all initial locales/themes. Record any remaining exceptions.

### T5.3 Staging and production deployment
- Create distinct Supabase projects and OAuth clients.
- Configure secrets in host secret manager.
- Deploy web and MCP independently.
- Set backup schedule and document restore process.

**Acceptance:** staging smoke tests pass; production secrets are isolated; no local/test credentials in production.

### T5.4 Release checklist
- Run full CI, production build, migration dry run, Playwright smoke, MCP smoke, backup restore verification.
- Document unresolved risks and deferred work.

**Acceptance:** all MVP release criteria in PROJECT_SPEC section 19 pass or are explicitly marked as a release blocker.

## Five-day focus map

- **Day 1:** T0.1–T0.4, T1.1–T1.5 (prioritize repo/CI, design tokens, theme/i18n foundations, auth, family, invitations, RLS tests).
- **Day 2:** T2.1–T2.5 (prioritize recipe create/read/update, role enforcement, distinctive responsive UI).
- **Day 3:** T2.6, T3.1–T3.4 (media, recipe translations, search; preserve revision integrity).
- **Day 4:** T4.1–T4.5 (MCP + staging OAuth proof; do not skip auth validation).
- **Day 5:** T5.1–T5.4 (hardening, tests, deployment and documentation).

If time is constrained, cut optional UI polish and deferred features before cutting RLS, auth, tenant isolation, transaction integrity, or negative permission tests.
