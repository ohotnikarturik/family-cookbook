# Accessibility release review (W35.17)

Target: **WCAG 2.2 Level AA** on primary journeys ([`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md), [`PROJECT_SPEC.md`](../PROJECT_SPEC.md) §15). Automated checks support release; they **do not** prove full conformance without manual assistive-technology testing.

## Automated coverage (CI)

Playwright + [`@axe-core/playwright`](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright) runs in the **Playwright E2E** GitHub Actions job (`pnpm test:e2e`):

| Spec | Routes |
| --- | --- |
| [`apps/web/e2e/sign-in-a11y.spec.ts`](../apps/web/e2e/sign-in-a11y.spec.ts) | `/en/auth/sign-in` (anonymous) |
| [`apps/web/e2e/critical-a11y.spec.ts`](../apps/web/e2e/critical-a11y.spec.ts) | Recipe list, recipe detail, members, family settings, invitations (owner session) |

Assertion helper: [`apps/web/e2e/fixtures/axe.ts`](../apps/web/e2e/fixtures/axe.ts). Tags: WCAG 2.x A/AA plus `wcag22aa` where supported. **Fails on `serious` or `critical` axe impacts.**

Local (Supabase + env synced):

```bash
pnpm supabase:start:core && pnpm supabase:reset && pnpm supabase:sync-env
pnpm --filter @family-cookbook/web test:e2e
```

## Manual release checklist

Complete before staging/production sign-off. Record date and tester in your release notes.

### Keyboard (no mouse)

- [ ] Sign-in: tab order reaches email, magic link, OTP fields, language, and theme controls; visible focus on all.
- [ ] Family switcher: open, choose another family, land on dashboard.
- [ ] Recipe list: search, filters, pagination controls operable; archive filter toggle announces state.
- [ ] Recipe detail: lifecycle actions reachable; dialogs trap focus and restore on close.
- [ ] Recipe editor: add/remove ingredient and step rows; submit and validation errors associated with fields.
- [ ] Members / invitations / settings: forms submit or show errors without losing focus context.

### Screen reader (pick one stack)

- [ ] VoiceOver + Safari (macOS) **or** NVDA + Firefox/Chrome (Windows).
- [ ] Sign-in errors and async status are announced (polite/assertive as implemented).
- [ ] Recipe headings and landmarks (`main`, nav) navigate predictably.
- [ ] Archive/restore confirmation explains consequences.

### Visual / layout

- [ ] **320px** and **360px** widths: no horizontal scroll on recipe list and detail.
- [ ] **200% browser zoom**: primary actions remain visible without hover-only affordances.
- [ ] **Light and dark** themes: contrast acceptable on primary buttons, links, and form errors.

### Locales

- [ ] Spot-check **fi**, **ru**, **uk** on sign-in and recipe list (no missing keys; Cyrillic readable).

## Documented WCAG exceptions

Rules disabled in automated tests must be listed here with rationale and issue link.

| Axe rule ID | Page / component | WCAG criterion | Rationale | Tracking |
| --- | --- | --- | --- | --- |
| _none_ | — | — | No standing exceptions as of W35.17 | — |

If a violation cannot be fixed before release, add a row and pass `disableRules` only in the specific Playwright test with a comment pointing to this table.

## Moderate / minor findings

Axe **moderate** or **minor** results are tracked in issues; they do not fail CI unless promoted to this exceptions table.

## Related

- Broader hardening backlog: **T5.2** in [`TASKS.md`](../TASKS.md).
- Staging functional smoke: [`fixtures/STAGING_SMOKE.md`](fixtures/STAGING_SMOKE.md).
