# Cursor start prompt — Family Cookbook

Use this prompt in **Plan mode** for the first session. It is intentionally limited to repository inspection and the first foundation task; do not ask Composer to build the entire application in one run.

## Prompt 1 — Initial planning (Plan mode)

```text
You are the lead engineer for the Family Cookbook project. We are starting from a new repository.

First, read these project documents completely and treat them as the source of truth:
- AGENTS.md
- PROJECT_SPEC.md
- DESIGN_SYSTEM.md
- TASKS.md

Product context:
- This is a multi-tenant family cookbook. A user can belong to more than one independent family workspace.
- The product is a mobile-first web application plus a separately deployable remote MCP server.
- Initial UI languages are English (en), Finnish (fi), Russian (ru), and Ukrainian (uk). Recipe content may be in any language and is independent of the UI language.
- The UI must have a distinctive, warm editorial visual identity, light/dark/system themes, strong accessibility, and all-ages usability. Do not ship an unmodified shadcn/ui appearance.
- Security, tenant isolation, server-side authorization, and PostgreSQL RLS are non-negotiable.

Working style:
- Work mostly autonomously within the specification. Do not ask me to approve ordinary code edits, file creation, local commands, formatting, dependency installation, or local tests when they are within scope.
- Make sensible, secure, maintainable defaults for non-blocking decisions and record material decisions in docs/DECISIONS.md.
- Ask me only when something is genuinely blocking or materially affects product behavior, architecture, data compatibility, privacy/security, recurring cost, or legal/licensing. Batch related questions into one concise message. Do not ask about minor preferences.
- Stop and ask for explicit approval before destructive operations, production database changes/migrations, production deployment, enabling paid services, using real secrets/credentials, publishing private data, weakening security, or deleting user data.
- Never invent credentials or provider settings. Use placeholders in .env.example.
- Do not implement the full product in one run. Follow TASKS.md in order, one task or bounded subtask at a time. Do not skip tests or acceptance criteria to move faster.

For this first session, do not write application code yet. Inspect the repository and the specification, identify any contradictions or missing decisions that would block T0.1, and create a detailed, reviewable implementation plan for T0.1 (Bootstrap monorepo) only. Include the intended directory tree, workspace/package boundaries, scripts, strict TypeScript and quality-tool setup, environment template, and checks. Verify current dependency/package recommendations against official documentation before proposing exact versions. Do not start T0.2 or any application feature.

Ask me questions only if a genuinely blocking decision cannot be safely defaulted. Otherwise state your assumptions and proceed with the plan. Save the plan into the workspace if Cursor offers that option. End with the plan, assumptions, risks, and the exact acceptance checks you will run after implementation. Wait for my review/Build approval before making code changes.
```

## Prompt 2 — Build the approved first task (Agent mode / Plan Build)

After reviewing the plan, use **Build** in Plan mode or switch to Agent mode and submit:

```text
Implement the approved T0.1 plan only. Follow AGENTS.md, PROJECT_SPEC.md, DESIGN_SYSTEM.md, and TASKS.md.

Work autonomously for all normal, reversible implementation steps. Create the monorepo structure and configuration, install the required dependencies, run the relevant checks, and fix issues caused by your changes. Do not implement product features, database schema, authentication, RLS, MCP tools, or T0.2 CI unless they are explicitly part of the approved T0.1 plan.

Do not cross any approval boundary in AGENTS.md. If a genuinely blocking question appears, stop and ask one concise, grouped question; otherwise choose a safe default and document it.

When finished, report exactly:
1. What was implemented.
2. Important architecture/dependency decisions and assumptions.
3. Files and folders created.
4. Commands and tests actually run, with pass/fail results.
5. Anything not verified or still blocked.
6. Whether T0.1 acceptance criteria are met.
7. The recommended next task (T0.2), without starting it.

Do not claim a check passed unless you ran it and observed success.
```

## Recommended session workflow

1. Open the new repository in Cursor and place all specification files at the repository root.
2. Select **Plan** mode and use Prompt 1 with Composer 2.5 Fast.
3. Review the plan. Correct any architectural misunderstanding before choosing **Build**.
4. Let the agent implement T0.1. Review the diff and the actual test output.
5. Commit the completed task to Git.
6. Start a fresh Agent chat for each next backlog task. Refer to its task ID (for example, `T0.2`) and the project files rather than pasting the full specification repeatedly.
7. Use Plan mode again for high-impact or multi-system tasks, especially RLS/authentication, invitations, file security, and MCP OAuth. Use Agent mode directly for well-defined tasks with clear acceptance criteria.

## Autonomy setting

Prefer autonomous execution for local, reversible work, but keep approval required for destructive or externally consequential actions. If Cursor offers terminal auto-run controls, choose a level that allows normal project commands while still requiring approval for destructive commands, production operations, credential access, and external account changes. Regardless of Cursor settings, the agent must follow the approval boundaries in `AGENTS.md`.
