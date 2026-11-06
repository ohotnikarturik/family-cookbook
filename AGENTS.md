# Instructions for AI coding agents

You are implementing the Family Cookbook product. Read `PROJECT_SPEC.md`, `DESIGN_SYSTEM.md`, and `TASKS.md` before coding. The specification is the source of truth unless the user explicitly changes it.

## Non-negotiable rules

1. **Security before convenience.** Never disable RLS to make a feature work. Never expose a Supabase service-role key or database admin credential to a browser, MCP client, or normal user request.
2. **Tenant isolation is mandatory.** Every family-owned record and file must be scoped to a family. Every operation must verify the caller's active membership and role. Client-supplied `family_id`, `user_id`, role, or creator identity is never authority.
3. **One shared business layer.** Web and MCP call the same application use cases. Do not duplicate recipe permission or mutation rules in the two apps.
4. **Validate at trust boundaries.** Use shared Zod v4 schemas and validate again on the server. Bound string lengths, array sizes, page sizes, upload sizes, and tool output sizes.
5. **Use migrations.** All schema, index, enum, function, trigger, and RLS changes go into new Supabase migrations. Never edit an already-applied migration; add a corrective migration.
6. **Preserve originals.** Never overwrite or delete an uploaded source file as a side effect of OCR, translation, or editing. Do not add OCR/AI import unless requested.
7. **Archive, do not hard-delete.** Normal recipe delete actions archive. Do not implement permanent recipe/family deletion unless the user explicitly requests it and the owner-only lifecycle requirements are designed.
8. **Protect tokens and private data.** Never log cookies, access/refresh tokens, invitation tokens, signed URLs, recipe bodies, or uploaded file contents. Never commit secrets.
9. **No arbitrary URL fetch.** Do not fetch user-supplied recipe URLs from the server in the MVP. This avoids SSRF exposure.
10. **MCP acts as the user.** Validate OAuth tokens, build a request-scoped user-bound Supabase client, and enforce RLS. No global service-role client for MCP tool calls.
11. **No placeholder security.** A TODO, mock policy, frontend-only role check, or permissive policy is not a completed security feature.
12. **Avoid speculative scope.** Implement the next task from `TASKS.md`; do not add meal planning, OCR, AI translation, public sharing, or unrelated abstractions.

## Working method

- Before a task, inspect the relevant existing code and tests. Summarize the intended change in the task/PR description.
- Work in small vertical slices. Prefer a complete, tested user journey over many disconnected UI components.
- Add or update tests in the same change as behavior.
- Keep TypeScript strict. Avoid `any`; if unavoidable at a third-party boundary, validate/narrow immediately and document why.
- Keep domain and application packages framework-independent.
- Keep React components free of direct database policy logic. Use server-side data-access and application services.
- Treat Next.js Server Actions and Route Handlers as public network boundaries: authenticate, validate, authorize, and rate-limit as applicable inside each entry point.
- All user-data repository functions must receive a request-scoped user context. Never reuse a user-bound client between requests/users.
- Use optimistic concurrency (`expected_version`) for recipe aggregate updates.
- Ensure aggregate mutations, revision snapshots, and audit records are transactionally consistent.
- Use generated storage object paths; do not trust filenames or MIME types supplied by the browser.
- For new MCP tools, define bounded schemas, permissions, output DTOs, error codes, and positive/negative tests before exposing the tool.
- Pin exact dependency versions in the lockfile. Do not upgrade major versions opportunistically during feature work.

## Required checks before marking a task complete

Run the relevant commands (adapt names to the package scripts actually created):

- formatting and lint;
- `tsc --noEmit` or workspace typecheck;
- affected Vitest unit tests;
- Supabase migration reset/apply from a clean local database;
- pgTAP/RLS tests for changed policies/tables;
- MCP tests for changed tools/auth behavior;
- Playwright critical flows for changed UI journeys;
- automated accessibility checks for changed UI journeys and manual keyboard/screen-reader checks before release;
- locale completeness/formatting checks for changed UI copy;
- production build.

Report exactly what passed, what failed, and what was not run. Never claim tests passed unless they were run and passed.

## Design, localization, and accessibility

- Read and follow `DESIGN_SYSTEM.md`. The intended product identity is warm, editorial, welcoming, and culinary—not a default shadcn/ui or generic SaaS appearance.
- Treat shadcn/ui as editable accessible primitives only. Customize them through the product tokens and component patterns; do not ship the unmodified default theme or page templates.
- Use semantic CSS variables/design tokens for all colors, typography, spacing, radii, shadows, and motion. Do not hard-code visual values throughout components. Support `system`, `light`, and `dark` themes; test both themes for every component state.
- Put every user-facing string in `next-intl` message catalogs. Do not hard-code interface copy in React components, Server Actions, API errors, or email templates. Initial UI locales are `en`, `fi`, `ru`, and `uk`. Keep UI locale distinct from recipe source/translation language.
- Mobile-first: test at 320px and 360px widths; ensure normal content reflows without horizontal scrolling.
- Keyboard accessible and semantic HTML; use clear headings, landmarks, visible focus, labels, accessible validation errors, and announced async status.
- Use 44×44 CSS px touch targets for primary actions where practical; never depend on hover or gestures alone.
- Respect reduced motion, support 200% text resizing, and provide sufficient contrast in both themes.
- Build explicit loading, empty, success, error, forbidden, and network-failure states.
- Aim for WCAG 2.2 AA; add automated axe checks and manual keyboard/screen-reader verification. Automated tests do not prove conformance.
- Favor plain language, clear labels, predictable navigation, visible text for important actions, and calm step-by-step interactions suitable for users of different ages and technical confidence.

## Dependency/version guidance

- Check current official documentation before installing or copying example code for Next.js, Supabase SSR, MCP SDK, Hono, or Zod.
- The target is the official MCP TypeScript SDK v2 split packages. Do not use old v1 package examples unless a verified compatibility issue requires a documented decision.
- Supabase OAuth 2.1 Server is a public-beta dependency as of the specification date. Prove the complete MCP discovery + PKCE + consent + token-validation flow in staging before treating it as production-ready.
- Use stable releases, pin exact versions, commit the lockfile, and explain any deviation from the recommended stack.


## Autonomy, questions, and approval boundaries

- Work autonomously within the approved specification and current task. Do not ask for confirmation for ordinary implementation details, file creation, formatting, local tests, or reversible refactors that are within scope.
- For non-blocking choices, choose the simplest secure and maintainable option consistent with the spec, record the decision briefly in the relevant documentation or task report, and continue.
- Ask the user only when a decision is genuinely blocking or materially changes product behavior, architecture, privacy, security, recurring cost, legal/licensing exposure, or future data compatibility. Batch related questions into one concise message; do not interrupt for minor preferences.
- Stop and request explicit approval before destructive data operations, production database migrations, production deployment, enabling paid external services, creating/using real credentials, publishing private content, changing authentication/authorization boundaries, disabling security checks, or deleting user data. Never infer consent for these actions.
- Never invent secrets, account IDs, provider configuration, or external service setup. Use placeholders in `.env.example` and document what the user must configure.
- Execute one backlog task or a clearly bounded subtask at a time. Do not attempt to implement the entire product in one run. After each task, run the relevant checks and report: summary, files changed, tests actually run and results, unresolved issues, and the next task. Continue to the next task only when the current task's acceptance criteria pass and no approval boundary is reached.
- If blocked by an unavailable external service, continue with a documented local/test adapter where the architecture permits; do not weaken production security or silently replace the chosen integration.
- Maintain a concise `docs/DECISIONS.md` (or equivalent) for non-obvious technical decisions so future agent sessions do not rediscover or contradict them.
