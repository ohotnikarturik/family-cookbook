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

### W35.14 — Production invitation email
- Production-safe email adapter (no local SMTP assumptions).

**Tests:** Staging send with test inbox; no secrets in logs.

### W35.15 — Deployment and environment documentation
- Staging/production Supabase, secrets, web deploy, env examples.

**Tests:** Staging smoke documented and repeatable.

### W35.16 — Backup and restoration verification
- Backup schedule and documented restore drill.

**Tests:** Recorded restore verification.

### W35.17 — Accessibility release review
- axe + manual keyboard/screen-reader pass on critical flows; WCAG 2.2 AA exceptions documented.

**Tests:** Automated axe in CI; checklist in release notes.

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
