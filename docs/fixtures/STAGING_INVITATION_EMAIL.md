# Staging — invitation email smoke test (W35.14)

Repeatable check that production SMTP settings deliver an invite without leaking secrets in logs.

## Prerequisites

- Staging web deploy with `NODE_ENV=production`.
- Supabase staging project and a test owner account.
- SMTP credentials in the host secret store (not in git):
  - `INVITATION_SMTP_HOST`, `INVITATION_SMTP_PORT`
  - `INVITATION_SMTP_FROM` (verified sender domain)
  - `INVITATION_SMTP_USER`, `INVITATION_SMTP_PASSWORD`
- A dedicated test inbox you control (not a seeded `.test` persona).

## Safety checks (before send)

1. Confirm staging env does **not** use `127.0.0.1` / `localhost` for `INVITATION_SMTP_HOST`.
2. Confirm `INVITATION_SMTP_FROM` is **not** `*@family-cookbook.test`.
3. Build logs and runtime logs must not print `INVITATION_SMTP_PASSWORD`, raw invitation tokens, or full message bodies.

## Procedure

1. Sign in on staging as **Owner** or **Admin** of a test family.
2. Open **Settings → Invitations**.
3. Invite the staging test inbox with role **Viewer**.
4. Expect UI success; pending row appears in the list.
5. In the test inbox, open the message within 5 minutes.
6. Verify localized subject/body, HTTPS accept link on the staging app host, and a single actionable link (no token echoed in logs).
7. Accept with the **same email**; confirm membership in the family.

## Failure modes

| Symptom | Likely cause |
|--------|----------------|
| “Invitation could not be sent” immediately | Missing/invalid SMTP env; production guard (`smtp_production_unsafe` / `smtp_invalid_config`) |
| Pending row + email error (kept) | Provider rejected send after DB insert — revoke and fix SMTP, then resend |
| No email, UI success | Provider delay/spam folder — check provider dashboard |

## Automated coverage

Vitest in `packages/application/src/invitations/invitation-smtp-config.test.ts` and `smtp-transport.test.ts` covers env parsing and transport options. This document is the **manual staging** gate required by W35.14.
