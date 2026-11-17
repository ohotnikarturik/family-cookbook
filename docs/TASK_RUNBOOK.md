# Task runbook — how to execute one backlog task

Instructions for the coding agent. It applies to any task in `TASKS.md`, whatever the epic. The user starts a **fresh session in plan mode** and says "Follow docs/TASK_RUNBOOK.md", optionally naming a task. Do exactly one task, then stop.

Be economical: every file read and tool call costs tokens. Read only what this runbook names, in parallel where independent, and do not re-read a file after editing it.

## 1. Pick the task

- If the user named a task (id or title), use it.
- Otherwise open the headings and statuses only: `grep -n -E '^#{2,3} |^\*\*Status' TASKS.md`. If an epic states an execution order, follow it; otherwise take file order. Choose the first task whose Status is not `Done`. Say which one in one line. If it is ambiguous (several candidates, or tasks without Status lines), list the candidates and ask the user to pick.
- Preflight, one parallel batch: `git status --short`, `git branch --show-current`, whether the app and local database are up (`curl -s -o /dev/null -w '%{http_code}' http://localhost:3003/en/auth/sign-in`, `docker ps --format '{{.Names}}' | grep -c supabase_db`). If the working tree has changes unrelated to this task, or the app or database is down, tell the user and stop. Work on the branch the user is on. Never create branches or commit unless asked.
- If the task is high-risk (it touches sign-in, permissions or RLS, a migration, a shared contract used by web and MCP, or user data) and the session is not on the most capable model, say so in one line and carry on.

## 2. Read, targeted (plan mode: read-only)

In one parallel batch read:
1. `AGENTS.md` (non-negotiable rules) and `apps/web/AGENTS.md`. For any Next.js API you are unsure about, grep `apps/web/node_modules/next/dist/docs/` first; this version differs from older ones.
2. The task's own section: `sed -n '/^### <task heading>/,/^\*\*Status/p' TASKS.md`, plus its epic's intro and any "rules for every task" block above it.
3. Decisions that apply: `grep -n '<task id>\|<epic name>' docs/DECISIONS.md`, then read only those entries.
4. UI tasks only: `DESIGN_SYSTEM.md` §4 (tokens), §7 (all-ages patterns), §8 (accessibility).

Read `PROJECT_SPEC.md` only for sections the task names. Use Grep, then Read with `offset`/`limit`, instead of reading big files whole. Do not spawn subagents.

Then inspect the files the task names and their tests. Look for existing helpers before writing new code (`grep -rn`); prefer extending existing components over new abstractions.

## 3. Plan (short), then ask for approval

Write the plan file and call ExitPlanMode. Keep it under ~40 lines:
- files to change and why (one line each);
- steps in order;
- tests to add or change (Vitest, pgTAP, Playwright) and existing e2e selectors that will break;
- for UI tasks, which pages you will compare in screenshots;
- risks, and any step needing the user's approval (see Stop conditions), with what you will ask.

ExitPlanMode is the approval request; do not ask "is the plan OK" in text. Ask the user a question only when a decision is genuinely theirs and TASKS.md cannot settle it.

## 4. Implement (after approval)

1. **Before editing**, for UI tasks, if the repo has a screenshot script (`grep '"test:screens"' package.json`), capture a baseline in the background: `SCREENS_LABEL=before-<task id> pnpm test:screens` (`run_in_background`, do not poll; output goes to the gitignored `apps/web/screenshots/`). Skip it for tasks with no UI change.
2. Work in small steps in the plan's order. Rules that matter most:
   - All user-facing text in `apps/web/messages/{en,fi,ru,uk}.json`, every locale, same keys, natural plain wording.
   - Design tokens and existing components only; no raw colours; 44px primary targets; works at 320px and 360px; light and dark; visible focus; semantic headings.
   - No permission logic in client components. The server decides; RLS stays authoritative. Never weaken RLS, validation or auth to make something work.
   - Schema changes only as new migration files; never edit an applied one.
   - Update e2e specs and fixtures that the change breaks, and add tests for new behaviour in the same change.
3. After each meaningful edit run only cheap, targeted checks: `pnpm exec prettier --write <changed files>`, the one relevant Vitest file, `pnpm --filter @family-cookbook/web typecheck`. Pipe output through `tail -20` or `grep -E 'error|fail|passed'`; never dump full logs.

## 5. Verify (all of it, once, at the end)

Use the package scripts that exist (`grep -n '"scripts"' -A30 package.json`). Normally, in this order, stopping at the first real failure, fixing it, and continuing:

```bash
pnpm format:check && pnpm lint && pnpm typecheck
pnpm test
pnpm --filter @family-cookbook/web build
pnpm test:e2e                       # when a user journey changed
pnpm supabase:test                  # when a migration, seed or RLS changed
SCREENS_LABEL=after-<task id> pnpm test:screens    # UI tasks
```

Also run the MCP tests (`pnpm --filter @family-cookbook/mcp test`) when shared contracts or use cases changed.

- A failure in code you did not touch: re-run once; if it persists, confirm with `git stash` that it fails without your change, then report it. Do not hide it, and do not fix unrelated code without saying so.
- Do not mark the task done while a required check fails or was not run.

**Screenshots, cheaply.** Compare the two `summary.json` files first (headings, highlighted nav, overflow per page). Then open images only for pages the task changed: usually `desktop-light-owner` and `phone-light-owner`, one dark image if colours changed, `viewer` if roles matter. At most about 8 images. Check layout, clipping at 360px, one highlighted nav item, one `h1`, no sideways scroll, and that long Russian or Finnish text fits.

## 6. Close out

- In `TASKS.md` set the task's `**Status:** Done (<date>). <one line: what passed>`. If something was not run or is open, say so there.
- Add a short entry to `docs/DECISIONS.md` only for a non-obvious choice a future session could contradict.
- Do not commit. Offer a Conventional Commits message with the task id and wait.
- If this was the last task of a group the user wants reviewed, mention that the review in §7 is available.

**Final report, at most ~15 lines:** what changed (user-visible first), files changed (grouped), each check as pass / fail / not run, screenshot findings, open issues, the suggested next task. No code listings and no restating the plan.

## 7. Group review (only when the user asks)

For "review this group of tasks" (the user names the group or the tasks): run the screenshot script with a `check-<name>` label, compare its `summary.json` files with the earliest `before-*` run and with any targets in `docs/fixtures/ui-baseline/README.md`, open about 8 images covering the main pages on phone and desktop, and list regressions and anything in the group still open. Do not fix anything unless asked.

## Stop conditions

Stop and ask the user before: any migration or `supabase:reset`, any sign-in, permission or RLS change, hosted or production settings or secrets, installing or upgrading dependencies, deleting data or files that are not yours, or when the task and the code disagree in a way TASKS.md cannot resolve.
