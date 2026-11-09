# Staging smoke (W35.15)

Run this against the **staging** web origin and **staging** Supabase project after a deploy. Do not use [`TEST_IDENTITIES.md`](TEST_IDENTITIES.md) or local Mailpit.

Record date, git SHA, staging app URL, and pass/fail per row. Do not paste tokens, magic-link URLs, SMTP passwords, or recipe bodies into the record.

## Preconditions

- [`DEPLOYMENT.md`](../DEPLOYMENT.md) isolation rules applied (separate staging project, HTTPS `NEXT_PUBLIC_APP_URL`, no service_role on the web host).
- `NODE_ENV=production` on the web process.
- Operator has a real email inbox they control (not `*@family-cookbook.test`).

## Checks

| # | Journey | Pass if |
| --- | --- | --- |
| 1 | Home | `GET {APP}/en` returns 200; locale prefix works (`/fi`, `/ru`, `/uk`). |
| 2 | Security headers | Response includes `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Strict-Transport-Security`. |
| 3 | Sign-in | Magic link arrives at the operator inbox; callback is `{APP}/auth/callback`; session cookie is `Secure`. |
| 4 | Create family | First signed-in user becomes **Owner**; dashboard loads only that family’s data. |
| 5 | Recipe CRUD | Owner/editor can create a recipe with ingredients and steps; Viewer (if invited) cannot. |
| 6 | Search | Title/ingredient search stays inside the active family. |
| 7 | Media | Authorized editor uploads a JPEG/PNG/WebP or PDF within limits; unsigned guess of another family’s object URL fails. |
| 8 | Archive | Archive with confirm + version; recipe leaves the default list; restore brings it back. |
| 9 | Invitation | Follow [`STAGING_INVITATION_EMAIL.md`](STAGING_INVITATION_EMAIL.md). |
| 10 | Preferences | Language (en/fi/ru/uk) and theme (system/light/dark) persist after refresh. |
| 11 | Secrets | Host logs and browser Network panel show **no** service_role, SMTP password, or raw invitation token. Client bundle is covered in CI by `pnpm verify:client-bundle`. |

## Fail and stop

Stop the smoke and do not promote to production if:

- Staging uses a local/loopback Supabase URL or Mailpit.
- RLS appears off or another family’s UUID is readable.
- Cookies are not `Secure` on HTTPS.
- Invitation email contains an `http://` accept link.

## After a pass

Keep the filled checklist with the release notes. Production uses the **same** steps on the production origin after a separate `db push` to the production project (explicit approval required).
