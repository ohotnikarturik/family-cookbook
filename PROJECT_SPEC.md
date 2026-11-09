# Family Cookbook — Product & Technical Implementation Specification

**Status:** Approved direction for MVP implementation  
**Version:** 1.2  
**Prepared:** 5 November 2026  
**Implementation (web gate):** EPIC 3.5 complete as of 10 November 2026 (`TASKS.md` W35.12). MCP (EPIC 4) and full staging release (§19.3) remain open.  
**Product type:** Private, multi-tenant family recipe library with a mobile-first web app and remote MCP interface

---

## 1. Executive summary

Build a secure, mobile-first web application where multiple independent families can preserve, organize, search, and share recipes. A user may belong to more than one family. Each family is a separate tenant with its own members, roles, recipes, media, invitations, and audit history.

The application has two primary interfaces:

1. **Web application:** the normal experience for family members, designed mobile-first and usable in a modern desktop browser.
2. **Remote MCP server:** a standards-based interface through which an authenticated AI client can search, read, create, update, archive, restore, and inspect recipe history.

Both interfaces must call the same application services and enforce the same authorization rules. PostgreSQL Row Level Security (RLS) is the final data-isolation boundary. The MCP server must never have broader access than the user who authorized the AI client.

The MVP should provide reliable recipe CRUD, family membership and invitations, private media storage, multilingual recipe content, useful search, revision history, audit events, and a working remote MCP integration. OCR, automatic translation, website scraping, meal planning, and native mobile apps are explicitly deferred.

## 2. Product principles

1. **Preserve originals.** A handwritten card, photograph, PDF, or imported text is source material. Structured recipe data and translations must not overwrite it.
2. **Multi-tenant from the start.** A user can belong to multiple families; a family cannot access another family's records or files.
3. **Permission checks are server-side and database-enforced.** Hiding a button is not authorization.
4. **Web and MCP share business logic.** Do not implement different recipe rules in the website and MCP service.
5. **Mobile-first, progressive enhancement.** The primary journeys must work on a 360px-wide phone viewport without horizontal scrolling.
6. **Distinctive, welcoming UX.** The product must feel like a thoughtfully designed family cookbook, not an unmodified admin dashboard or default component-library starter.
7. **Accessible for all ages.** Use plain language, clear navigation, readable typography, generous controls, predictable interactions, and WCAG 2.2 AA as the target.
8. **Localization by design.** UI language, user preference, family default language, recipe source language, and recipe translations are separate concepts.
9. **Useful before clever.** Ship manual structured recipes and manual translations before AI import/translation features.
10. **Reversible operations.** Normal deletion means archive. Permanent purge is a separately authorized family-owner operation and is outside the normal MVP UI.
11. **Explicit trust boundaries.** Treat uploads, pasted URLs, recipe text, and all AI tool inputs as untrusted.

## 3. Goals and non-goals

### 3.1 MVP goals

- Email-based user sign-up, sign-in, sign-out, and session renewal.
- Create a family workspace and invite family members by email.
- Assign and enforce the roles defined in section 6.
- Allow users to belong to multiple families and switch active family.
- Create, read, edit, archive, and restore recipes.
- Store recipe title, description, original language, category, servings, preparation/cooking time, ingredients, steps, tags, and notes.
- Upload private recipe photographs and PDFs within explicit size/type limits.
- Preserve the original uploaded source while displaying sanitized/derived media where appropriate.
- Add manual translations without replacing the original-language recipe.
- Search by title, description, ingredient, category, tag, language, and contributor.
- Keep recipe revision history and security-relevant audit events.
- Expose the same core operations through a remote MCP endpoint using per-user authentication.
- Provide automated unit, database-policy, integration, and browser tests.
- Deliver a distinctive, mobile-first visual identity with light, dark, and system appearance modes.
- Externalize all user-facing interface copy into localization message catalogs; support English, Finnish, Russian, and Ukrainian as initial UI locales, with architecture for adding more.
- Meet the WCAG 2.2 AA target across the primary user journeys and test with keyboard, screen reader, zoom, and automated accessibility tooling.

### 3.2 Explicitly out of scope for MVP

- OCR/handwriting recognition and automatic extraction from photos or PDFs.
- Automatic AI translation or AI-generated recipe content.
- Automatic fetching/scraping of arbitrary recipe URLs.
- Arbitrary file types, executable files, archives, or office document processing.
- Public recipes, public profiles, social discovery, or cross-family sharing.
- Native iOS/Android applications.
- Offline-first synchronization.
- Meal planning, shopping lists, nutrition calculations, pantry management, and grocery integrations.
- Recipe ratings/reviews and social feeds.
- Custom user-defined roles or per-recipe ACLs.
- Billing, subscriptions, public self-service family registration, or SaaS administration console.

These may be considered after real family use validates the MVP.

## 4. Users and primary journeys

### 4.1 User types

- **Family owner:** creates the family and retains ultimate ownership.
- **Family admin:** manages routine membership and family-level settings within owner boundaries.
- **Editor:** manages recipes for the family.
- **Contributor:** contributes recipes and maintains their own contributions.
- **Viewer:** can browse and search but cannot change content.
- **AI client:** an external MCP client acting only with a signed-in user's delegated permissions. It is not a separate family role.

### 4.2 Primary journeys

**A. Create a family**
1. User signs in.
2. User creates a family with a display name and optional default UI language.
3. A transaction creates the family and makes the creator its sole initial owner.
4. User lands on the family cookbook dashboard.

**B. Invite a relative**
1. Owner/admin chooses an email and an allowed role.
2. System creates a cryptographically random, single-use invitation token; only its hash is stored.
3. Email contains an HTTPS invitation URL.
4. Recipient signs in or creates an account using the invited email.
5. Server validates token hash, expiry, unused status, and matching verified email, then adds the membership in one transaction.
6. Invitation is marked accepted and cannot be reused.

**C. Add a recipe**
1. Contributor/editor/admin/owner opens the add-recipe flow.
2. They enter a title, original language, optional category/description/timings/servings, ingredients, and ordered steps.
3. They may attach a photo or PDF source.
4. Server validates and writes the recipe and child rows transactionally.
5. A revision snapshot and audit event are recorded.
6. Recipe is searchable within that family only.

**D. Preserve a handwritten recipe**
1. User uploads a photograph or PDF.
2. The original file is stored privately and never silently replaced by OCR or translation.
3. User manually enters structured data, optionally in a different language.
4. The asset is linked to the recipe as an original source.

**E. Connect an AI tool**
1. User configures the remote MCP endpoint in an MCP-compatible client.
2. Client discovers the authorization server and starts OAuth authorization-code flow with PKCE.
3. User signs in and sees a consent screen identifying the client.
4. User authorizes access.
5. The client calls MCP tools with its user access token.
6. MCP service validates the token and performs operations through the same user-scoped data-access layer and RLS policies as the web app.
7. User can revoke the client authorization from account/security settings where supported by the OAuth provider.

## 5. Recommended technology stack

Use stable, mutually compatible versions and commit the lockfile. Do not use canary/nightly framework builds in the MVP.

| Layer | Decision | Notes |
|---|---|---|
| Language | TypeScript, strict mode | Shared across web, MCP, and packages. |
| Web framework | Next.js App Router + React | Server Components by default; Client Components only for interactivity. |
| UI primitives | Tailwind CSS + shadcn/ui components | Use as editable accessible building blocks only; do not ship the default shadcn visual language unchanged. |
| Product design system | In-repo tokens + custom cookbook components | Defined in `DESIGN_SYSTEM.md`; semantic CSS variables drive light/dark themes and component variants. |
| Icons | Lucide React | Consistent icon family; icon-only controls require accessible names and should be avoided for primary navigation. |
| Forms | React Hook Form + Zod v4 | Server validates independently; client validation is UX only. |
| i18n | `next-intl` | App Router locale routing, message catalogs, locale-aware dates/numbers/plurals. Pin and verify current stable version. |
| Database | Supabase PostgreSQL | Relational schema, migrations, RLS, indexes, pgTAP tests. |
| Authentication | Supabase Auth | Email OTP/magic link initially; keep auth provider replaceable behind a small adapter. |
| Next.js Supabase integration | `@supabase/ssr` | Pin exact version and isolate behind `packages/data-access`; verify current package status/API when bootstrapping. |
| File storage | Supabase Storage, private bucket | Storage policies are separate from application-table policies. |
| MCP | Official MCP TypeScript SDK v2 | Use split v2 packages; pin the exact compatible release. |
| MCP HTTP runtime | Hono on Node.js | Separate deployable service; use official SDK Hono adapter where appropriate. |
| Validation/contracts | Zod v4 | Shared schemas for server actions, routes, and MCP tools. |
| Unit tests | Vitest | Domain and application-service tests. |
| Browser/E2E tests | Playwright | Desktop and mobile viewports, multiple accounts/roles. |
| Database tests | pgTAP + Supabase local stack | RLS and transaction behavior. |
| CI | GitHub Actions | Lint, typecheck, tests, build, migration checks, dependency and secret scanning. |
| Package management | pnpm workspaces | A small monorepo; avoid premature microservices. |

### 5.1 Rendering model

- Pages/layouts are Server Components by default.
- Use Client Components only for stateful interactions: recipe editor controls, upload progress, dialogs, filters, responsive navigation, and other browser-only features.
- Fetch protected data on the server through the data-access layer.
- Server Actions may be used for internal form mutations, but every action must independently authenticate and authorize the request because Server Actions are network-reachable endpoints.
- Route Handlers are used for explicit HTTP interfaces such as upload finalization, OAuth consent screens/callback handling if required by the chosen provider flow, health checks, and webhooks.
- Do not put all MCP logic in Next.js Server Actions or couple the MCP server lifecycle to the web process.
- Resolve locale on the server from the explicit URL locale first, then saved user preference, then supported browser `Accept-Language`, then the configured default. Never infer a user's language from their family or recipe language.
- Set the document `lang` attribute for the active UI locale and mark recipe passages/translations with their own language when it differs.

### 5.2 Runtime and deployment assumptions

- Run web and MCP as separate applications in one monorepo.
- Web may be deployed to a managed Next.js host. MCP must run on a Node.js host/container that supports persistent HTTP request handling and the selected Streamable HTTP transport.
- Supabase hosted project is the initial managed database/auth/storage provider.
- Development, staging, and production must use separate Supabase projects and OAuth client registrations.
- Add Docker support for the MCP service and document local development with the Supabase CLI.
- Choose the hosting vendors during implementation; keep application code provider-neutral where practical.

## 6. Tenant and permission model

### 6.1 Tenant model

- A **family** is the tenant boundary.
- A **user** may have zero, one, or many family memberships.
- Every family-owned row must contain `family_id` directly or be protected through a composite foreign key to a family-owned parent.
- Every recipe and media object belongs to exactly one family.
- A user's last-selected family is a UI preference only and must never be treated as authorization.
- All data queries and mutations take an explicit family context, then verify that the authenticated user is an active member.

### 6.2 Roles and capabilities

| Capability | Owner | Admin | Editor | Contributor | Viewer |
|---|:---:|:---:|:---:|:---:|:---:|
| View/search family recipes | Yes | Yes | Yes | Yes | Yes |
| Create recipe | Yes | Yes | Yes | Yes | No |
| Edit any recipe | Yes | Yes | Yes | No | No |
| Edit own recipe | Yes | Yes | Yes | Yes | No |
| Archive/restore any recipe | Yes | Yes | Yes | No | No |
| Archive/restore own recipe | Yes | Yes | Yes | Yes | No |
| Manage tags/categories | Yes | Yes | Yes | No | No |
| Invite/remove ordinary members | Yes | Yes | No | No | No |
| Assign/change Editor/Contributor/Viewer | Yes | Yes | No | No | No |
| Grant/revoke Admin | Yes | No | No | No | No |
| Transfer ownership | Yes | No | No | No | No |
| Change family settings | Yes | Yes | No | No | No |
| Permanently delete family | Yes, with re-auth/confirmation | No | No | No | No |

Rules:
- There must be exactly one active owner per family.
- Admin cannot promote a user to Admin or Owner, remove an Owner, transfer ownership, or delete a family.
- Owner cannot leave, be removed, or be demoted until ownership is transferred.
- Owner transfer must be an explicit, transactional operation; the previous owner becomes Admin unless the owner selects another supported role.
- Editors can edit all recipes but cannot manage family membership.
- Contributors can edit/archive/restore only recipes whose `created_by` is their user ID.
- Viewers are read-only.
- `created_by` is immutable after creation.
- A role change or membership removal must invalidate access on the next request; do not trust stale role information stored in client state.

### 6.3 Authorization implementation

- Application-level checks are required for clear UX and defense in depth.
- PostgreSQL RLS is the final enforcement boundary for all exposed data tables.
- Every table reachable through Supabase APIs must have RLS enabled and reviewed policies.
- Never depend on a client-supplied `family_id`, `created_by`, role, or user ID without independently verifying it.
- Prefer database helper functions in a non-exposed schema for membership/role predicates. If a `SECURITY DEFINER` helper is used, it must have a fixed safe `search_path`, narrow return behavior, explicit `EXECUTE` grants, no dynamic SQL, and review/tests for privilege escalation.
- Do not use a service-role key for normal user requests. It bypasses RLS. If a future maintenance job truly needs elevated access, isolate it in a non-user-facing process, document why, narrowly scope it, and audit it.

## 7. Core data model

Use UUID primary keys generated by PostgreSQL. Use `timestamptz` for timestamps and UTC at rest. Use soft archive for recipes. Use migrations as the only schema-change mechanism.

### 7.1 Tables

#### `profiles`
- `user_id uuid primary key references auth.users(id) on delete cascade`
- `display_name text not null`
- `avatar_asset_id uuid null` (optional; only if avatar handling is implemented)
- `preferred_language text not null default 'en'` (BCP 47; user's UI locale)
- `theme_preference text not null default 'system'` (`system`, `light`, `dark`)
- `created_at`, `updated_at`

Do not duplicate or expose authentication secrets. Store email in Supabase Auth; only expose verified email to an authorized invitation workflow when necessary.

#### `families`
- `id uuid primary key`
- `name text not null` (1–120 chars)
- `default_language text not null default 'en'`
- `created_by uuid not null references profiles(user_id)`
- `created_at`, `updated_at`
- `deleted_at timestamptz null` (reserved for owner-only lifecycle/purge workflow; ordinary deletion is not exposed in MVP)

#### `family_members`
- `id uuid primary key`
- `family_id uuid not null references families(id)`
- `user_id uuid not null references profiles(user_id)`
- `role family_role not null` (`owner`, `admin`, `editor`, `contributor`, `viewer`)
- `status membership_status not null default 'active'` (`active`, `suspended`)
- `joined_at timestamptz not null`
- `created_at`, `updated_at`
- unique (`family_id`, `user_id`)
- indexes on (`user_id`, `status`) and (`family_id`, `role`, `status`)

Enforce **at most one** active Owner with a partial unique index. Enforce **at least one** active Owner through transaction-safe database operations for family bootstrap, ownership transfer, suspension, removal, and role change (and, where practical, a deferred constraint trigger). Never allow a committed family state with zero active Owners. Family bootstrap and ownership transfer must be transactional.

#### `family_invitations`
- `id uuid primary key`
- `family_id uuid not null references families(id)`
- `email_normalized text not null`
- `role family_role not null` (must not be `owner`; only Owner may invite Admin)
- `token_hash text not null unique`
- `invited_by uuid not null references profiles(user_id)`
- `expires_at timestamptz not null`
- `accepted_at timestamptz null`
- `accepted_by uuid null references profiles(user_id)`
- `revoked_at timestamptz null`
- `created_at`

Store only a cryptographic hash of the random invitation token. Enforce one-time redemption and expiration transactionally. Never log raw tokens.

#### `recipes`
- `id uuid primary key`
- `family_id uuid not null references families(id)`
- `created_by uuid not null references profiles(user_id)` (immutable)
- `updated_by uuid not null references profiles(user_id)`
- `title text not null` (1–200 chars)
- `description text null` (max 5,000 chars)
- `source_language text not null` (BCP 47 language tag, e.g. `fi`, `en`, `ru`, `uk`)
- `category text null` (max 80 chars; family-managed controlled vocabulary may be added later)
- `servings numeric(8,2) null` (must be > 0 when present)
- `prep_minutes integer null` (>= 0)
- `cook_minutes integer null` (>= 0)
- `notes text null` (max 10,000 chars)
- `status recipe_status not null default 'active'` (`active`, `archived`)
- `version integer not null default 1`
- `created_at`, `updated_at`, `archived_at timestamptz null`
- unique (`id`, `family_id`) to support composite child foreign keys
- indexes for family/status/updated time and family/created_by

#### `recipe_ingredients`
- `id uuid primary key`
- `recipe_id uuid not null`
- `family_id uuid not null`
- `position integer not null`
- `name text not null` (1–200 chars)
- `quantity numeric(12,4) null`
- `quantity_text text null` (for values such as `to taste`, `a handful`, or `1–2`)
- `unit text null` (max 60 chars)
- `notes text null` (max 500 chars)
- unique (`recipe_id`, `position`)
- unique (`id`, `family_id`) for tenant-safe translation references
- composite FK (`recipe_id`, `family_id`) -> `recipes(id`, `family_id`) with cascade on recipe delete

At least one of `quantity` or `quantity_text` may be supplied; both can be null for ingredients such as garnish. Keep original ingredient text in notes/source where needed. Do not assume every amount is numeric.

#### `recipe_steps`
- `id uuid primary key`
- `recipe_id uuid not null`
- `family_id uuid not null`
- `position integer not null`
- `instruction text not null` (1–5,000 chars)
- `duration_minutes integer null` (>= 0)
- `media_asset_id uuid null` (optional step image)
- unique (`recipe_id`, `position`)
- unique (`id`, `family_id`) for tenant-safe translation references
- composite FK (`recipe_id`, `family_id`) -> `recipes(id`, `family_id`)

#### `recipe_translations`
- `id uuid primary key`
- `recipe_id uuid not null`
- `family_id uuid not null`
- `language_tag text not null`
- `title text not null`
- `description text null`
- `notes text null`
- `review_status translation_review_status not null default 'unreviewed'` (`unreviewed`, `reviewed`)
- `created_by uuid not null references profiles(user_id)`
- `reviewed_by uuid null references profiles(user_id)`
- `reviewed_at timestamptz null`
- `created_at`, `updated_at`
- unique (`recipe_id`, `language_tag`)
- composite FK to recipe

#### `recipe_ingredient_translations`
- `id uuid primary key`
- `ingredient_id uuid not null references recipe_ingredients(id) on delete cascade`
- `family_id uuid not null`
- `language_tag text not null`
- `name text not null`
- `notes text null`
- unique (`ingredient_id`, `language_tag`)
- composite FK (`ingredient_id`, `family_id`) -> `recipe_ingredients(id`, `family_id`)

#### `recipe_step_translations`
- `id uuid primary key`
- `step_id uuid not null references recipe_steps(id) on delete cascade`
- `family_id uuid not null`
- `language_tag text not null`
- `instruction text not null`
- unique (`step_id`, `language_tag`)
- composite FK (`step_id`, `family_id`) -> `recipe_steps(id`, `family_id`)

#### `family_tags`
- `id uuid primary key`
- `family_id uuid not null references families(id)`
- `name text not null` (1–50 chars)
- `normalized_name text not null`
- `created_by uuid not null references profiles(user_id)`
- `created_at`
- unique (`family_id`, `normalized_name`)

#### `recipe_tags`
- `family_id uuid not null`
- `recipe_id uuid not null`
- `tag_id uuid not null references family_tags(id)`
- primary key (`recipe_id`, `tag_id`)
- composite FK (`recipe_id`, `family_id`) -> `recipes(id`, `family_id`)

#### `recipe_assets`
- `id uuid primary key`
- `family_id uuid not null`
- `recipe_id uuid not null`
- `uploaded_by uuid not null references profiles(user_id)`
- `bucket_id text not null` (expected private bucket name)
- `object_path text not null unique`
- `asset_kind asset_kind not null` (`original_photo`, `original_document`, `recipe_photo`, `step_photo`)
- `original_filename text null` (display-only; never use as storage path)
- `detected_mime_type text not null`
- `byte_size bigint not null`
- `checksum_sha256 text not null`
- `processing_status asset_status not null` (`pending`, `quarantined`, `available`, `rejected`)
- `created_at`, `available_at timestamptz null`
- composite FK to recipe

#### `recipe_revisions`
- `id uuid primary key`
- `family_id uuid not null`
- `recipe_id uuid not null`
- `version integer not null`
- `changed_by uuid not null references profiles(user_id)`
- `change_summary text null` (max 500 chars)
- `snapshot jsonb not null` (complete recipe aggregate, excluding secrets and signed URLs)
- `created_at`
- unique (`recipe_id`, `version`)
- composite FK to recipe

Create a revision snapshot in the same transaction as each successful recipe aggregate mutation. A failed save must not leave a partial recipe or an orphaned revision. Use a database function/transaction boundary or a server-side transactional PostgreSQL connection with a verified caller identity; do not approximate atomicity with unrelated sequential requests.

#### `audit_events`
- `id uuid primary key`
- `family_id uuid not null`
- `actor_user_id uuid null references profiles(user_id)` (null only for a clearly identified system action)
- `event_type text not null` (allowlisted event names)
- `entity_type text not null`
- `entity_id uuid null`
- `client_id text null` (MCP OAuth client ID where applicable)
- `metadata jsonb not null default '{}'` (strict allowlist; no tokens, secrets, full recipe body, or unnecessary personal data)
- `created_at`

Audit records are append-only for application users. Access to audit history is role-restricted. Do not rely on an application-only log for database-security events.

### 7.2 Data integrity rules

- Use composite foreign keys for family-owned parent/child rows so a child cannot reference a recipe in a different family.
- All family-scoped unique constraints must include `family_id` where uniqueness is tenant-local.
- Use transactions for family creation, invitation redemption, ownership transfer, recipe aggregate writes, and archive/restore.
- Validate text length and numeric bounds at both application and database layers where practical.
- Normalize email for invitation matching; require verified email before redemption.
- Use BCP 47 language tags. Do not force all recipes into the family default language.
- Keep original source language distinct from the UI language and any translation language.
- Store no signed storage URLs in the database or revision snapshots; generate them on demand after authorization.

## 8. Recipe behavior and search

### 8.1 Recipe aggregate

A recipe consists of one `recipes` row plus zero or more ingredients, steps, tags, translations, and media assets. A recipe can exist with incomplete ingredient/step content to allow gradual transcription, but it must have a title and original language.

### 8.2 Search

MVP search must be family-scoped and support:
- case-insensitive title/description text search;
- ingredient name search;
- category and tag filters;
- source language/translation language filter;
- contributor filter;
- active/archived filter (archived excluded by default);
- sort by updated date, created date, or title;
- pagination, maximum 50 results per request.

Use PostgreSQL full-text search with the `simple` configuration as a first multilingual-friendly baseline, plus `pg_trgm` for typo-tolerant title matching where useful. Search is not semantic AI search in the MVP. Index the family scope and searchable fields. Search must never return results from a different family.

### 8.3 Serving-size scaling

Do not silently modify the stored recipe. If implemented in the MVP, calculate scaled ingredient quantities in the presentation layer from the base serving count and show original values as the source. Text quantities (e.g. `to taste`) remain unchanged. Unit conversion is out of scope.

### 8.4 Original source and URL safety

- Store uploaded original files unchanged in private storage.
- A pasted source URL may be stored as text, but do not fetch it from the server in the MVP. Arbitrary URL fetching creates SSRF and malicious-content risks.
- Do not execute, render, or embed uploaded HTML/SVG.
- PDF preview can be deferred; the safe default is an authorized download with attachment disposition.

## 9. File upload and media security

### 9.1 MVP allowlist

Allow only:
- JPEG/JPG images;
- PNG images;
- WebP images;
- PDF documents.

Initial limits:
- Image: 15 MiB maximum per file.
- PDF: 25 MiB maximum per file.
- Maximum 10 attachments per recipe in MVP (make configurable server-side).
- No SVG, HTML, ZIP, executable, audio, video, Word, or arbitrary binary files in MVP.

### 9.2 Upload workflow

1. Authenticated user requests an upload slot for a recipe and family.
2. Server checks family membership, recipe write permission, allowed extension/type, declared size, and per-user/family rate limits.
3. Server generates an opaque random object path scoped under the family and recipe; never use a user-supplied path.
4. Browser uploads to a private bucket using a short-lived signed upload URL or a controlled server upload path.
5. Server finalizes the upload: verifies actual size, file signature/magic bytes, detected MIME type, and checksum; then inserts/updates the `recipe_assets` row.
6. Asset remains `quarantined` or `pending` until validation/processing succeeds; only `available` assets can be read.
7. Read access requires an authenticated member and a short-lived signed download URL.

### 9.3 Additional controls

- Storage bucket must be private. Never make recipe media public.
- Storage policies must be written and tested independently of application-table RLS policies; one does not automatically protect the other.
- Use generated object paths and store original filename only as display metadata.
- Verify file signature in addition to client MIME and extension.
- Re-encode display image derivatives with a trusted image library and strip EXIF metadata where practical; retain the original as private source material.
- Serve PDFs as attachments by default unless a safe preview path is implemented.
- Add malware scanning before processing/downloading untrusted documents when a suitable service is available. Until then, do not automatically parse or execute document contents.
- Never place user-supplied filenames directly into HTTP headers without safe encoding.
- Rate-limit upload creation and finalization.

## 10. Authentication, sessions, and invitations

### 10.1 Web authentication

- Initial method: Supabase email OTP/magic link. Add password or social login only if needed.
- Use the PKCE flow for server-side rendering.
- Use the supported Supabase SSR cookie integration behind one adapter; pin package version and cover refresh behavior with tests.
- Cookies must use secure production settings (`Secure`, `HttpOnly` where applicable, `SameSite=Lax` or stricter, correct path/domain).
- Do not store access or refresh tokens in browser local storage.
- Every protected server entry point must verify the current session server-side.
- Implement logout, expired-session handling, and re-authentication for sensitive owner actions.

### 10.2 Invitations

- Only Owner/Admin can invite.
- Admin may invite Viewer, Contributor, or Editor. Only Owner may invite Admin.
- Never invite Owner directly; ownership is transferred.
- Invitation URL must use HTTPS in production, have high-entropy random token, store only token hash, expire (default 7 days), be single use, and be revocable.
- Invite acceptance requires a verified email equal to the normalized invited email.
- Redemption must be atomic and protected from replay/race conditions.
- Do not disclose whether an arbitrary email already has an account.
- Email delivery provider is an implementation choice. Create an adapter; provide local-development logging without exposing real production tokens in logs.

## 11. MCP server specification

### 11.1 Responsibilities

- Expose recipe and family-context tools over MCP.
- Authenticate each remote client request.
- Map the authenticated token to a real Supabase user identity.
- Create a request-scoped, user-token-bound data client.
- Reuse application services and DB policies.
- Validate all tool inputs with shared Zod schemas.
- Enforce limits, return concise structured outputs, and write audit events.
- Never expose direct SQL, arbitrary file access, admin-only service keys, or unbounded search.

### 11.2 Transport and authorization

- Primary transport: Streamable HTTP at a documented endpoint, e.g. `https://mcp.<domain>/mcp`.
- Implement with the official MCP TypeScript SDK v2 and a supported Node/Hono adapter.
- Use Supabase Auth OAuth 2.1 Server as the authorization server only after verifying the current beta behavior, MCP discovery compatibility, token claims, revocation behavior, and consent flow in staging.
- Use Authorization Code + PKCE. No implicit flow, password grant, client-credentials grant, or shared static bearer token.
- Prefer asymmetric JWT signing keys (e.g. RS256/ES256) for OAuth/JWKS interoperability. Do not give signing secrets to MCP clients.
- Build an explicit authorization/consent screen that identifies the OAuth client and the user. Do not enable unattended authorization by default.
- Dynamic client registration may be enabled only with user consent and monitoring; validate redirect URIs according to provider rules and avoid broad wildcard redirects.
- Validate signature, issuer, audience where applicable, expiration, not-before, subject/user ID, token type, and required claims on every request. Use the provider's maintained discovery/JWKS data and safe caching/rotation behavior.
- MCP service must not store refresh tokens. The MCP client manages its OAuth session; MCP requests use the short-lived access token.
- If Supabase OAuth 2.1 Server beta cannot meet the required MCP client compatibility or operational guarantees, keep the MCP service independent and replace only the authorization adapter/provider rather than weakening auth.

### 11.3 Family context

- `list_my_families` returns the authenticated user's active family memberships and roles.
- Every recipe operation requires an explicit `family_id` in the tool input.
- The supplied family ID is untrusted input. Verify active membership through RLS/application service on every call.
- Never infer authorization from the last-selected family in the website or from model conversation context.

### 11.4 MVP MCP tools

| Tool | Inputs | Behavior / permission |
|---|---|---|
| `list_my_families` | none | Returns only caller's active memberships: family ID, family name, role. |
| `search_recipes` | `family_id`, optional `query`, `ingredient`, `category`, `tag`, `language`, `created_by`, `include_archived`, `limit`, `cursor` | Read access for all active members; family-scoped; max 50 results. |
| `get_recipe` | `family_id`, `recipe_id`, optional `language` | Read access; returns structured recipe, ingredients, steps, tags, available asset metadata, and version. Do not include signed media URLs by default. |
| `create_recipe` | `family_id`, recipe payload | Owner/Admin/Editor/Contributor. Server sets `created_by` and `updated_by`; ignore client-supplied IDs/ownership. |
| `update_recipe` | `family_id`, `recipe_id`, `expected_version`, patch payload | Owner/Admin/Editor for any; Contributor only own. Require optimistic concurrency via `expected_version`. |
| `archive_recipe` | `family_id`, `recipe_id`, `expected_version`, `confirm: true` | Owner/Admin/Editor for any; Contributor only own. Archive only; no permanent delete. |
| `restore_recipe` | `family_id`, `recipe_id`, `expected_version` | Same authority as archive. |
| `get_recipe_history` | `family_id`, `recipe_id`, optional pagination | Owner/Admin/Editor; Contributor can see own recipe history; Viewer history access may be enabled later. |

Tool schemas must set reasonable length/array bounds. Search results should return compact summaries and stable IDs, not entire media bodies. Use consistent error codes/messages such as `AUTH_REQUIRED`, `FAMILY_ACCESS_DENIED`, `NOT_FOUND`, `VALIDATION_ERROR`, `VERSION_CONFLICT`, `RATE_LIMITED`, and `CONFIRMATION_REQUIRED` without disclosing internal database details.

For MCP write tools:
- Include descriptive tool annotations where supported (read-only vs write/destructive hints).
- Do not offer permanent deletion in MVP.
- `archive_recipe` must require `confirm: true` and should return the affected recipe ID and resulting version.
- `update_recipe` must reject stale `expected_version` and return a conflict response with current version, without overwriting newer data.
- Add idempotency support for `create_recipe` if the SDK/client interaction model supports it cleanly; otherwise document that retries may create a duplicate and provide a safe duplicate-detection UX.

### 11.5 MCP session and availability design

Prefer a stateless request model if supported by the pinned SDK and target MCP specification, because authorization and user context are carried on each request. If the selected transport/SDK requires MCP session state, store only protocol/session metadata in a managed shared store; never store user refresh tokens or recipe authorization state in process memory alone. Ensure multi-instance deployment works without sticky sessions unless explicitly required and documented.

### 11.6 MCP audit

Record tool name, actor user ID, family ID, entity ID, OAuth client ID, outcome, and timestamp. Do not log access tokens, refresh tokens, raw invitation tokens, full recipe payloads, or uploaded file contents. Audit successful writes and denied authorization attempts, with rate limits to prevent audit-log abuse.

## 12. Web application information architecture

### 12.1 Routes (suggested)

Use a locale segment for user-facing pages (for example `/en/families` and `/fi/families`). Keep technical auth/OAuth callbacks at stable unlocalized endpoints where required by provider redirect registration; localize their human-facing screens using the saved/preferred locale.

- `/{locale}` — redirect to sign-in or active family dashboard.
- `/{locale}/auth/sign-in` — localized sign-in screen.
- `/auth/callback` — technical authentication callback.
- `/{locale}/onboarding` — create or join a family.
- `/{locale}/families` — list/switch family workspaces.
- `/{locale}/f/[familyId]` — family dashboard.
- `/{locale}/f/[familyId]/recipes` — recipe list/search.
- `/{locale}/f/[familyId]/recipes/new` — create recipe.
- `/{locale}/f/[familyId]/recipes/[recipeId]` — recipe detail.
- `/{locale}/f/[familyId]/recipes/[recipeId]/edit` — edit recipe.
- `/{locale}/f/[familyId]/settings/members` — member/role management.
- `/{locale}/f/[familyId]/settings/invitations` — pending/revoked invitations.
- `/{locale}/f/[familyId]/settings` — family settings.
- `/{locale}/account/preferences` — UI language and appearance settings.
- `/{locale}/account/security` — sessions and connected MCP client authorizations, where supported.
- `/{locale}/oauth/consent` — localized OAuth authorization/consent UI if required by Supabase OAuth Server.

Use `next-intl` routing with a locale segment and a configured default locale. Validate locale values against the allowlist. Treat every route as an untrusted entry. Route layout checks are for UX; DAL and RLS remain authoritative.

### 12.2 Visual direction and product identity

The Family Cookbook must have a distinctive, warm, editorial culinary identity. It should feel like a carefully curated family cookbook or food journal: welcoming, human, calm, tactile, and contemporary. It must not look like an untouched shadcn/ui, generic SaaS dashboard, or admin template.

Initial art direction (the design tokens and components must make this easy to refine later):
- **Palette:** warm paper/cream and ink-inspired neutrals in light mode; deep, warm charcoal/forest neutrals in dark mode; restrained herb/olive and terracotta accents. Color must remain functional and pass contrast checks. Do not use color as the only way to communicate status.
- **Typography:** highly readable sans-serif for body text and controls; an optional expressive serif for editorial headings and recipe titles. Verify full glyph coverage for every supported locale (including Cyrillic) and provide robust fallbacks. Do not use decorative type for instructions, ingredients, forms, or small text.
- **Photography:** food and family recipe imagery should be prominent where available. Preserve natural image proportions, use consistent cropping only for thumbnails, and never make an image necessary to understand a recipe. Provide useful alt text or empty alt for decorative images.
- **Layout:** generous but purposeful spacing, clear hierarchy, readable line lengths, soft surface separation, restrained borders/shadows, and a small consistent radius scale. Avoid visual clutter, dense data tables, excessive pills/badges, and animation that competes with content.
- **Voice:** friendly, plain, respectful and easy to translate. Prefer familiar words and explicit action labels over clever wording.
- **Components:** create product-specific patterns such as `RecipeCard`, `RecipeList`, `RecipeHeader`, `IngredientList`, `RecipeStep`, `RecipeSourceGallery`, `FamilySwitcher`, `LanguageSwitcher`, `ThemeSwitcher`, and `PhotoUpload`. These live in the repository and follow the design tokens.

`shadcn/ui` is allowed as an accessible source of editable primitives (dialog, dropdown, popover, form control, tabs, toast, etc.). It is not the finished visual design. Customize component anatomy, typography, spacing, color, radii, density, hover/focus/pressed states, and responsive behavior to match `DESIGN_SYSTEM.md`. Do not blindly install every component or retain the default shadcn palette, geometry, or page templates. Prefer a small, intentional component set.

### 12.3 Design tokens and theming

- Use semantic CSS custom properties as the single source of truth for color and visual tokens. Define light and dark values centrally; components must consume tokens rather than hard-code hex/RGB colors. Use OKLCH or another documented perceptually coherent color representation where supported by the chosen Tailwind setup.
- Define tokens for page/background, surface/elevated surface, primary text, secondary text, muted text, border, primary action, accent, destructive, success/warning/info, focus ring, overlay, and recipe-specific visual accents. Include foreground tokens for every filled surface.
- Define typography, spacing, content-width, control-height, radius, border, shadow/elevation, and motion-duration tokens. Document their intended use.
- Support three appearance settings: `system`, `light`, and `dark`. Default to `system`; save the authenticated user's choice in `profiles.theme_preference`. Apply it without a visible flash when practical. The preference follows the user across families and devices.
- Light and dark modes are both first-class designs, not a simple CSS inversion. Validate every component, illustration, photograph treatment, focus state, chart/status color, and empty state in both.
- Brand changes should normally be made by editing the central token/theme files and component variants, not by editing every component. User-facing wording must live in translation catalogs, not in theme files.
- Add a documented theme preview route or Storybook-style component gallery so tokens and states can be reviewed together. Do not make Storybook a release blocker if a lightweight in-app `/design-preview` route provides the same value.

### 12.4 Accessibility and all-ages usability

Target **WCAG 2.2 Level AA** for the application. Automated tools are helpful but do not replace manual keyboard and assistive-technology testing.

Required interaction and content rules:
- Use semantic HTML landmarks, a logical heading hierarchy, descriptive page titles, explicit form labels, meaningful link text, and accessible names for controls.
- All primary functions must work with keyboard alone. Provide a visible focus indicator with sufficient contrast; do not allow sticky headers, dialogs, menus, or bottom navigation to obscure focused elements.
- Normal text contrast must be at least 4.5:1; large text and essential non-text UI boundaries/states must meet applicable WCAG AA contrast requirements. Verify both light and dark themes.
- Support text resizing to 200% without loss of content/functionality and reflow at 320 CSS px without two-dimensional scrolling for normal content. Test mobile layout at 360px as the product baseline.
- Use touch targets of at least 44×44 CSS px for primary interactive controls where practical (more generous than the WCAG 2.2 AA minimum), with enough spacing to avoid accidental taps.
- Do not rely on hover, color, gesture, icon shape, or position alone. Pair icons with visible text for primary navigation and important actions. Tooltips may supplement but must not replace labels.
- Respect `prefers-reduced-motion`; avoid autoplay, parallax, essential animated transitions, flashing, and motion that cannot be disabled.
- Announce asynchronous updates, upload progress, validation summaries, and save success/failure through appropriate live regions without repeatedly interrupting screen readers.
- Validation errors must identify the field in text, explain how to fix it, be associated programmatically, and move focus appropriately after failed submission. Preserve entered values after recoverable errors.
- Use forgiving confirmation patterns: explain consequences before destructive/irreversible actions; use undo/restore where available; avoid time pressure. Never make archive or leave-family actions appear as permanent deletion.
- Use plain-language microcopy, predictable placement, visible navigation, consistent button labels, and short step-by-step forms. Do not hide important functions behind gestures or unexplained icons. Avoid dense layouts and unnecessary memory burden.
- Ensure authentication supports password managers/autofill and accessible email OTP/magic-link interactions. Avoid visual CAPTCHAs or cognitive puzzles unless a verified abuse need requires an accessible alternative.
- Provide meaningful alt text for informative images. For mixed-language content, set appropriate `lang` attributes so screen readers can select correct pronunciation.

Manual accessibility checks must include at least one keyboard-only pass and one screen-reader pass with a supported desktop/browser combination (for example NVDA + Firefox/Chrome or VoiceOver + Safari). Include automated axe checks in Playwright for critical pages.

### 12.5 Internationalization and localization (i18n/l10n)

The application UI and recipe content are different language domains and must not be conflated.

- Use `next-intl` with the Next.js App Router for localized UI messages and locale-aware formatting. Keep all interface copy (navigation, labels, validation, confirmation, empty/error states, emails, notifications) in message catalogs; no user-facing strings hard-coded inside React components or server responses.
- Initial UI locales: English (`en`), Finnish (`fi`), Russian (`ru`), and Ukrainian (`uk`). Structure locale configuration so additional BCP 47 locales can be added without changing application logic. The default fallback is English until product configuration changes it.
- Use user `profiles.preferred_language` for UI preference. Use family `families.default_language` only as a sensible default when creating family-owned content or inviting a new member; it must not override a user's explicit UI preference.
- Resolve explicit locale URL first, then saved user preference, then browser preference when supported, then default locale. Provide a visible language selector and remember the choice. Avoid changing the language unexpectedly on every visit.
- Localize dates, times, numbers, plural forms, servings/quantities, and validation messages using locale-aware APIs/formatters. Do not concatenate translated sentence fragments. Use ICU-compatible plural/select messages.
- Keep all stored language values as BCP 47 tags. Recipe source language and each translation language remain explicit metadata. Recipe title, description, ingredient and step text can be in any language independently of the UI locale.
- Never silently translate or overwrite family content. A translation is a separate editable/reviewable version; preserve the original text and language.
- Mark content fragments with their actual `lang` when they differ from the UI language. Ensure supported font fallback covers Latin diacritics and Cyrillic, including Ukrainian-specific letters such as і, ї, є and ґ.
- Translation keys should be stable, namespaced by feature, and checked for missing/unused keys in CI or a documented localization check. Include a process for adding a locale and reviewing completeness.

### 12.6 Mobile-first design requirements

- Design for phone first, then tablet/desktop. Minimum product test viewport is 360 CSS px; primary content must reflow without horizontal scrolling at 320 CSS px.
- Provide clear persistent navigation. On narrow screens, use a simple labeled bottom navigation or equivalent compact pattern; on larger screens, use a clear top/side navigation. Do not use icon-only primary navigation. Keep the add-recipe action easy to find.
- Recipe title, author, source language, servings, and timing must be scannable on a phone.
- Ingredients and instructions use a single readable column; avoid dense multi-column layouts. Long instructions should have comfortable line length and spacing.
- Recipe creation/editing is a calm, single-column flow on phones, with clear grouping and a progress cue only if the flow is genuinely multi-step. Preserve user-entered data after validation/network failures.
- Upload flow must support taking a photo from a phone camera through browser file input, show preview/progress, and explain file limits in plain language.
- Loading, empty, error, offline/network failure, success, and permission-denied states must be intentionally designed in every major journey.
- No essential action may require hover, drag-only input, or precise pointer movement. Provide button-based alternatives to drag-and-drop.

### 12.7 MVP screens

1. Sign in / callback / account state.
2. Onboarding: create family or accept invitation.
3. Family selector.
4. Family dashboard with recently updated recipes and a prominent create action.
5. Recipe list with search, category/tag/language filters, sort, and pagination.
6. Recipe detail with ingredient list, steps, original source/media, translation selector, contributor and last-updated metadata.
7. Recipe create/edit form with dynamic ingredients and steps.
8. Member list with role badges and permitted member actions.
9. Invitation create/revoke screen.
10. Family settings.
11. Account preferences: language, appearance (`system`/`light`/`dark`), and account security/connected clients where supported.
12. Design preview/component gallery for reviewing tokens, components, and their light/dark/accessibility states (development-only or owner/admin-only).

## 13. Application architecture and package boundaries

Use a pnpm monorepo:

```text
family-cookbook/
├── apps/
│   ├── web/                    # Next.js App Router
│   └── mcp/                    # Remote MCP service (Node + Hono)
├── packages/
│   ├── contracts/              # Shared Zod schemas and public DTOs
│   ├── domain/                 # Domain types, invariants, pure calculations
│   ├── permissions/            # Role/capability definitions and checks
│   ├── application/             # Use cases shared by web and MCP
│   ├── data-access/             # Request-scoped Supabase clients/repositories
│   └── config/                  # Shared lint/TS/test config where useful
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── tests/                  # pgTAP, RLS, transaction tests
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SECURITY.md
│   ├── DATABASE.md
│   └── MCP.md
├── AGENTS.md
├── PROJECT_SPEC.md
├── TASKS.md
├── package.json
├── pnpm-workspace.yaml
└── .env.example
```

### 13.1 Layer responsibilities

- `contracts`: Zod input/output schemas. No database calls.
- `domain`: pure domain rules, types, version conflict logic, ingredient scaling helper if needed. No framework imports.
- `permissions`: role definitions and capability checks. The database RLS policy remains authoritative.
- `application`: use cases such as `createRecipe`, `updateRecipe`, `archiveRecipe`, `inviteMember`, and `acceptInvitation`. No UI code. Receives a request-scoped actor/context.
- `data-access`: Supabase client factories and repository functions. No UI imports. User-scoped clients are mandatory for user data.
- `apps/web`: UI, routing, Server Actions, Route Handlers; calls application use cases.
- `apps/mcp`: OAuth validation/SDK transport, tool schemas, MCP error mapping; calls the same application use cases.

Do not allow React components to issue arbitrary SQL or construct tenant authorization rules. Do not duplicate use-case logic across apps.

### 13.2 Request context

Every use case receives an immutable server-created context similar to:

```ts
type ActorContext = {
  userId: string;
  accessToken: string;
  requestId: string;
  client: "web" | "mcp";
  oauthClientId?: string;
};

type FamilyContext = {
  familyId: string;
};
```

The actor context is created only after session/token validation. Never accept `userId`, `role`, `accessToken`, or `oauthClientId` from an ordinary form/tool payload as authority. `familyId` is a requested resource scope and must be checked against RLS on every operation.

## 14. API and mutation behavior

- Web internal mutations may use Server Actions.
- Every action validates input with Zod on the server, authenticates the user, resolves the target family, authorizes capability and ownership, and calls an application use case.
- All mutations should return typed success/error results; do not leak stack traces or SQL messages to clients.
- Use optimistic concurrency for recipe updates via `expected_version`.
- Use transactions for aggregate writes and membership changes.
- For upload, use dedicated server endpoints for create-upload-slot and finalize-upload.
- Avoid creating a public REST API in the MVP unless a non-MCP external integration requires it. MCP is the explicit AI integration surface.

## 15. Search indexes and performance

Initial indexes should cover:
- `family_members(user_id, status)`;
- `family_members(family_id, role, status)`;
- `recipes(family_id, status, updated_at desc)`;
- `recipes(family_id, created_by, updated_at desc)`;
- full-text search document for title/description/category as appropriate;
- `pg_trgm` GIN index on title where useful;
- `recipe_ingredients(family_id, name)` with normalized/searchable form;
- `family_tags(family_id, normalized_name)`;
- `recipe_revisions(recipe_id, version desc)`;
- `recipe_assets(recipe_id, processing_status)`.

All list/search queries must paginate. Never return an unbounded list of recipes, ingredients, audit events, or revisions. Keep query plans under test with representative fixtures. Do not add vector embeddings or a separate search service in the MVP.

## 16. Observability, privacy, and operations

- Structured logs with request ID, actor ID (where safe), route/tool name, family ID, status, duration, and error category.
- Redact authorization headers, cookies, access/refresh tokens, invitation tokens, signed URLs, and personal content.
- Track auth failures, denied access, upload failures, MCP tool errors, rate-limit events, and database errors.
- Health endpoint must not disclose environment secrets or database internals.
- Add error tracking only with PII minimization and documented retention.
- Provide a documented backup/restore procedure and perform at least one restoration test before calling the system production-ready.
- Separate local/staging/production data and secrets.
- Keep an incident procedure for leaked credentials, unauthorized access, and accidental file exposure.
- Implement family export and owner-requested family closure/purge as a post-MVP data portability/lifecycle task unless an operational obligation requires it earlier. Do not claim the product has full deletion/export capabilities until these are built and tested.

## 17. Security baseline and threat model

### 17.1 Threats to address

- Cross-family IDOR / tenant data leakage.
- Stale or forged roles and client-supplied ownership fields.
- Unauthorized recipe updates through direct Server Action or MCP requests.
- Token theft, replay, incorrect issuer/audience validation, and OAuth redirect abuse.
- Malicious/oversized uploads, MIME spoofing, content sniffing, and private-file leakage.
- SSRF through pasted recipe URLs.
- Invitation token brute-force/replay and email enumeration.
- Rate abuse against auth, search, uploads, and MCP.
- Prompt injection via recipe content returned to AI clients (treat recipe data as untrusted content; do not interpret it as server instructions).
- Secrets accidentally committed or logged.

### 17.2 Required controls

- HTTPS only in production; HSTS on web and MCP domains.
- Secure cookie/session configuration; PKCE for web server-side auth.
- Strict origin/CORS policy; no wildcard credentialed CORS.
- Security headers including CSP appropriate to the app, `X-Content-Type-Options: nosniff`, and a restrictive `Referrer-Policy`.
- Zod validation on every external input and server-side length/count bounds.
- SQL parameterization; no user-composed SQL or unsafe dynamic identifiers.
- RLS for all tenant-owned tables and independent Storage object policies.
- Request-scoped user identity; no shared privileged user context.
- Rate limiting at the edge/service for login, invite redemption, upload, search, and MCP.
- Strict file allowlist, byte verification, size limits, quarantine state, private storage, and signed URLs.
- No arbitrary server-side fetches for user-supplied URLs.
- Least-privilege database grants and narrowly scoped helper functions.
- Secret scanning in CI and no secrets in source control, logs, client bundles, or error reports.
- Dependency audit in CI and a process for security updates.
- Re-authentication/strong confirmation for owner transfer and family deletion.

### 17.3 Security acceptance tests

The following must be automated where feasible:
1. User from Family A cannot select, search, update, archive, restore, or download an asset from Family B, even with a known UUID.
2. Viewer cannot create/update/archive/restore recipes through web, direct Server Action invocation, database API, or MCP.
3. Contributor cannot edit another member's recipe.
4. Editor cannot invite or modify family membership.
5. Admin cannot grant Admin/Owner, transfer ownership, or remove the Owner.
6. Only one active Owner can exist for a family.
7. A removed/suspended member loses access on the next request; stale UI state cannot bypass it.
8. Expired, revoked, replayed, or wrong-email invitation tokens cannot be redeemed.
9. A forged/expired/wrong-issuer/wrong-audience MCP token is rejected.
10. MCP family_id tampering cannot cross tenant boundaries.
11. Storage object access is denied without both an active family membership and an available matching asset record.
12. Upload MIME spoofing, oversized files, SVG/HTML/archives, and unrecognized magic bytes are rejected.
13. A stale recipe `expected_version` returns a conflict and does not overwrite newer data.
14. No tests or logs contain live tokens/secrets.

## 18. Testing strategy and quality gates

### 18.1 Unit tests (Vitest)

- Role/capability matrix.
- Recipe schema validation and content length bounds.
- Ingredient quantity parsing/formatting only if implemented.
- Language-tag validation.
- Optimistic concurrency/version conflict logic.
- Application use-case permission checks with mocked repository boundaries.

### 18.2 Database tests (pgTAP)

- RLS select/insert/update/delete behavior for each role.
- Family A / Family B isolation.
- Composite foreign key tenant integrity.
- Owner uniqueness and transfer behavior.
- Invitation one-time transactional redemption.
- Recipe aggregate save + revision atomicity.
- Storage policy checks and helper-function privileges.

### 18.3 Integration tests

- Supabase Auth session -> request-scoped user client -> RLS-protected repository.
- Upload slot -> private upload -> validation/finalize -> authorized read URL.
- MCP OAuth discovery/authorization/token validation -> tools -> user-scoped database access.
- MCP write tool -> same revision and audit behavior as web write.

### 18.4 End-to-end tests (Playwright)

Use separate test users and two families. Cover:
- signup/sign-in/sign-out;
- family create and switch;
- invite and accept;
- recipe create/edit/archive/restore;
- media upload and access control;
- search/filter/pagination;
- manual translation;
- mobile viewport layout and keyboard navigation;
- role-denied workflows.

### 18.5 CI required checks

A pull request cannot merge unless the **CI** workflow (`.github/workflows/ci.yml`) passes:

- **Quality:** formatting/lint, TypeScript strict typecheck, unit tests, production build, client-bundle secret scan;
- **Security:** Gitleaks and `pnpm audit --audit-level high`;
- **pgTAP / RLS:** local Supabase Postgres, `db reset`, and `supabase/tests/*.sql`;
- **Playwright E2E:** Supabase core stack, reset, web build, critical journeys (`ubuntu-24.04` runner until Playwright supports newer Ubuntu images).

When MCP (EPIC 4) is implemented, add MCP contract/integration tests for touched tools to the required checks.

Database migrations must apply from a clean local database (enforced by the pgTAP job reset).

## 19. Acceptance criteria for MVP release

Release is split into a **web application gate** (EPIC 3.5, local/CI-verified), an **MCP gate** (EPIC 4), and a **full MVP release gate** (staging). Track implementation in [`TASKS.md`](TASKS.md).

### 19.1 Web application gate (EPIC 3.5)

**Status:** Met as of 10 November 2026 (`TASKS.md` W35.12) via local Supabase, Vitest, pgTAP (20 files), and Playwright critical journeys in CI.

The web gate is satisfied when the criteria below pass against the **local Supabase stack** or an equivalent isolated environment. Staging sign-off is required for §19.3 only.

#### Product
- A user can register/sign in and create a family.
- The creator is the initial Owner.
- Owner/Admin can invite a relative by email with an allowed role.
- Invitee can accept only using the matching verified email and the invite is single-use.
- A user can belong to multiple families and switch between them.
- Family member role changes take effect on the next request.
- Authorized members can create/edit/view/archive/restore recipes according to the role matrix.
- Recipes can store ingredients, steps, source language, category, servings, timings, tags, notes, and translations.
- Original image/PDF source can be attached and remains privately accessible.
- Search works within the active family and supports title and ingredient at minimum.
- Recipe revision history is available to authorized roles.
- UI supports English, Finnish, Russian, and Ukrainian, with a user-controlled language preference and locale-aware formatting.
- UI supports system/light/dark appearance preference; all themes pass contrast checks and share a centralized token system.
- Primary journeys are keyboard usable and work at 320px/360px widths and 200% zoom; automated axe on sign-in; formal WCAG 2.2 AA release review is [`TASKS.md`](TASKS.md) W35.17.
- The visual identity is based on the custom Family Cookbook design system, not an unmodified shadcn/ui starter.

Additional EPIC 3.5 product scope (member suspension/reactivation, owner transfer, contributor search picker, account/family settings, media upload UI) is implemented per [`docs/DECISIONS.md`](docs/DECISIONS.md) EPIC 3.5.

#### Security and operations (web gate)

- All tenant tables have reviewed RLS policies; storage bucket is private with pgTAP-tested policies.
- Automated coverage for §17.3 items **1–8, 11–13** via pgTAP, Vitest, and Playwright (cross-family isolation, role matrix, invitations, storage/asset rules, optimistic concurrency). Items **9–10** require MCP (EPIC 4); **rate limiting and header hardening** are [`TASKS.md`](TASKS.md) W35.13 / T5.1.
- No service-role secret is exposed to browser bundles (`verify:client-bundle` in CI).
- Secrets are not committed; `.env.example` uses placeholders only.
- CI runs the checks in §18.5 (Quality, Security, pgTAP, Playwright).

### 19.2 MCP gate (EPIC 4) — deferred until web gate passes

**Status:** Not started; `apps/mcp` is a health-check placeholder. Begin EPIC 4 after W35.12.

- An MCP-compatible client can discover and connect to the remote endpoint using OAuth 2.1 authorization code + PKCE.
- The consent UI identifies the client and requires explicit user approval.
- `list_my_families`, `search_recipes`, `get_recipe`, `create_recipe`, `update_recipe`, `archive_recipe`, `restore_recipe`, and `get_recipe_history` work.
- MCP tool authorization matches web authorization.
- An AI client cannot access a family that the user does not belong to.
- Writes produce the same revision and audit records as web writes.
- §17.3 items **9–10** (forged MCP token, `family_id` tampering) pass automated tests.

### 19.3 Full MVP release gate (staging)

The **full** MVP is complete only when §19.1 and §19.2 criteria pass in a **staging** environment, plus:

- Production-safe invitation email (W35.14).
- Rate limits, secure headers, CORS, and log redaction per T5.1 / W35.13.
- Staging/production Supabase and deploy environments are isolated (W35.15).
- Backup and restore procedure is documented and restoration tested (W35.16).
- Accessibility release review with documented WCAG 2.2 AA exceptions, if any (W35.17).

## 20. Five-day implementation order

The five days are a focused MVP sprint, not a claim that a security-audited production service can be completed in five calendar days. Prefer working vertical slices and passing tests over superficial feature count.

### Day 1 — Project and tenant foundation
- Bootstrap monorepo, Next.js app, MCP app placeholder, shared TS/Zod config, lint/format, GitHub Actions.
- Create Supabase local project and migration workflow.
- Implement profiles, families, family_members, invitations, role enum, RLS helper functions and initial RLS policies.
- Implement sign-in, create family, family selector, invite acceptance.
- Add pgTAP tests for tenant isolation and role restrictions.

**Exit gate:** two test users in two families cannot read each other's family records; create-family creates exactly one owner; invitation cannot be replayed.

### Day 2 — Recipe core
- Implement recipes, ingredients, steps, tags, revisions, audit events.
- Implement transaction-safe recipe aggregate create/update/archive/restore use cases.
- Build dashboard, recipe list, detail, create/edit forms.
- Add optimistic concurrency and revision history.
- Add unit, database, and Playwright tests for recipe CRUD and role matrix.

**Exit gate:** a Contributor can create/edit own recipe but cannot edit another Contributor's recipe; Viewer is read-only.

### Day 3 — Media, localization, and search
- Implement private Storage bucket and object policies.
- Implement upload-slot/finalize workflow, allowlist and size limits.
- Implement recipe assets, manual translations and translation review status.
- Implement indexed family-scoped title/ingredient search and pagination.
- Run mobile layout and accessibility checks.

**Exit gate:** an authorized member can attach a valid private image/PDF; cross-family asset access is denied; a recipe can be manually represented in more than one language.

### Day 4 — MCP integration
- Implement OAuth server configuration and consent UI in staging.
- Implement remote Streamable HTTP MCP service using the official SDK v2.
- Implement token validation and per-request user-scoped Supabase client.
- Implement the MVP tools and common error mapping.
- Add MCP integration tests, including family ID tampering and denied writes.

**Exit gate:** at least one supported MCP client connects through user OAuth and can read/write only what the authorizing user is allowed to access.

### Day 5 — Hardening and release candidate
- Complete missing tests and security acceptance cases.
- Add rate limiting, secure headers, log redaction, health checks, dependency/secret scanning.
- Configure separate staging/production settings and deploy both apps.
- Test backup/restore and migration rollout.
- Finalize architecture/security/MCP docs, `.env.example`, local setup and troubleshooting.

**Exit gate:** all CI checks pass; critical security tests pass; staging deployment works; unresolved risks are written down rather than silently ignored.

## 21. Deferred roadmap

### Phase 2 — Assisted import
- OCR for photos and PDFs.
- Structured recipe extraction with human review before save.
- AI translation with original text retained and translation marked unreviewed.
- Controlled import adapters for selected trusted recipe sites; no arbitrary unrestricted URL fetch.
- MCP resource templates for recipe reading and optional prompts for search/meal ideas.

### Phase 3 — Cooking experience
- Cooking mode with large step cards and timers.
- Serving-size scaling and unit conversion.
- Family meal planning and shopping lists.
- Voice input and voice cooking assistance.

### Phase 4 — Portability and platform maturity
- Full family export (JSON + original media archive).
- Owner-approved family closure/purge with grace period and audit record.
- Fine-grained connected-client management and scopes if supported by the auth provider.
- Optional native wrapper/PWA enhancements.

## 22. Open implementation decisions (not blockers)

The following can be chosen during bootstrap without changing the product architecture:
- Exact web and MCP hosting vendors.
- Email delivery vendor and template service.
- Error monitoring vendor.
- Exact rate-limiting provider.
- Final fine-grained palette, font pairing, illustration/photography art direction, and component-specific visual details (must follow `DESIGN_SYSTEM.md`).
- Whether social login is added after email OTP.

The following are **mandatory verification gates**, not discretionary shortcuts:
- Pin and verify exact Next.js, React, Supabase SSR, MCP SDK, Hono, and Zod versions together.
- Verify Supabase OAuth 2.1 Server beta and MCP discovery/consent behavior in a staging project before production.
- Verify the selected host supports MCP Streamable HTTP behavior and required runtime duration.
- Verify RLS and Storage policies with automated tests before any production data is uploaded.

## 23. Official reference documentation

Use current official documentation during implementation; do not copy outdated tutorials without checking package/version and API status.

- Next.js App Router — Server and Client Components: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js data mutation / Server Functions: https://nextjs.org/docs/app/getting-started/mutating-data
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase SSR auth: https://supabase.com/docs/guides/auth/server-side
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase OAuth 2.1 Server: https://supabase.com/docs/guides/auth/oauth-server
- Supabase OAuth 2.1 MCP authentication: https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication
- Official MCP TypeScript SDK v2: https://github.com/modelcontextprotocol/typescript-sdk
- MCP specification: https://modelcontextprotocol.io/specification
- OWASP ASVS 5.0: https://asvs.owasp.org/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Next.js App Router internationalization: https://nextjs.org/docs/app/guides/internationalization
- next-intl: https://next-intl.dev/docs/getting-started
- shadcn/ui customization and theming: https://ui.shadcn.com/docs/theming
- OWASP File Upload Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html

**Version-sensitive note (5 November 2026):** the official TypeScript MCP SDK repository identifies v2 as its stable release line implementing the 2026-07-28 MCP specification. Supabase OAuth 2.1 Server is documented as public beta. Treat exact package versions and provider behavior as bootstrap-time verification items, not permanent assumptions.
