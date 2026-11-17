import { expect, test, type Page } from '@playwright/test';

import { expectNoSeriousAxeViolations } from './fixtures/axe';

/**
 * W38.3: sign-in by 6-digit code, with the email link as a fallback.
 * Reads the real message from local Mailpit (the Auth template carries both code and link).
 */

const MAILPIT = process.env['MAILPIT_URL'] ?? 'http://127.0.0.1:54324';
const SIGNED_IN_URL = /\/(en\/)?(onboarding|families|f\/|account)/;

let counter = 0;

function uniqueEmail(label: string): string {
  counter += 1;
  return `e2e-code-${label}-${Date.now()}-${counter}@family-cookbook.test`;
}

/** Each test gets its own client IP so the per-IP sign-in limit (12 / 15 min) is never shared. */
function uniqueClientIp(): string {
  const octet = () => Math.floor(Math.random() * 250) + 2;
  return `10.${octet()}.${octet()}.${octet()}`;
}

type MailpitMessage = Readonly<{ Text: string }>;

async function readSignInMessage(email: string): Promise<MailpitMessage> {
  let found: MailpitMessage | undefined;
  await expect
    .poll(
      async () => {
        const search = await fetch(
          `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`,
        );
        if (!search.ok) return false;
        const body = (await search.json()) as { messages?: { ID: string }[] };
        const id = body.messages?.[0]?.ID;
        if (!id) return false;
        const message = await fetch(`${MAILPIT}/api/v1/message/${id}`);
        if (!message.ok) return false;
        found = (await message.json()) as MailpitMessage;
        return true;
      },
      { timeout: 20_000, message: `No sign-in message in Mailpit for ${email}` },
    )
    .toBe(true);
  if (!found) throw new Error('unreachable');
  return found;
}

/** Null when the local Auth email has no code (the custom template is not applied). */
function codeFrom(message: MailpitMessage): string | null {
  return /(?:^|\s)(\d{6})(?:\s|$)/m.exec(message.Text)?.[1] ?? null;
}

const NO_CODE_REASON =
  'Local Auth email has no 6-digit code: apply supabase/templates/magic_link.html (see docs/LOCAL_SUPABASE.md)';

function linkFrom(message: MailpitMessage): string {
  const match = /https?:\/\/[^\s<>"]+\/auth\/v1\/verify\?[^\s<>"]+/.exec(message.Text);
  if (!match) throw new Error('No sign-in link in the sign-in message');
  return match[0];
}

async function requestCode(page: Page, email: string): Promise<void> {
  await page.goto('/en/auth/sign-in');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('button', { name: 'Email me a sign-in code' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Check your email' })).toBeVisible();
}

test.describe('sign-in by code', () => {
  test.beforeEach(async ({ context }) => {
    await context.setExtraHTTPHeaders({ 'x-forwarded-for': uniqueClientIp() });
  });

  test('step 1 shows one email field and no magic-link wording', async ({ page }) => {
    await page.goto('/en/auth/sign-in');
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Email me a sign-in code' })).toBeVisible();
    await expect(page.getByText(/magic link/i)).toHaveCount(0);
    await expect(page.getByLabel('6-digit code')).toHaveCount(0);
  });

  test('typing the code from the email signs in and submits on the sixth digit', async ({
    page,
  }) => {
    const email = uniqueEmail('type');
    await requestCode(page, email);

    const codeField = page.getByLabel('6-digit code');
    await expect(codeField).toBeFocused();
    await expect(page.getByRole('status').filter({ hasText: email })).toBeVisible();

    const code = codeFrom(await readSignInMessage(email));
    test.skip(code === null, NO_CODE_REASON);
    await codeField.pressSequentially(code ?? '');
    await page.waitForURL(SIGNED_IN_URL, { timeout: 20_000 });
  });

  test('a pasted code with spaces is cleaned and accepted', async ({ page }) => {
    const email = uniqueEmail('paste');
    await requestCode(page, email);
    const code = codeFrom(await readSignInMessage(email));
    test.skip(code === null, NO_CODE_REASON);
    await page
      .getByLabel('6-digit code')
      .fill(`${(code ?? '').slice(0, 3)} ${(code ?? '').slice(3)}`);
    await page.waitForURL(SIGNED_IN_URL, { timeout: 20_000 });
  });

  test('the link in the same email still signs in', async ({ page }) => {
    const email = uniqueEmail('link');
    await requestCode(page, email);
    const link = linkFrom(await readSignInMessage(email));
    await page.goto(link);
    await page.waitForURL(SIGNED_IN_URL, { timeout: 20_000 });
  });

  test('a wrong code shows an error and stays on the code step', async ({ page }) => {
    const email = uniqueEmail('wrong');
    await requestCode(page, email);
    // A 1-in-a-million collision with the real code would fail this test; acceptable.
    await page.getByLabel('6-digit code').fill('000000');
    await expect(
      page.getByRole('alert').filter({ hasText: 'That code did not work' }),
    ).toBeVisible();
    await expect(page.getByLabel('6-digit code')).toBeFocused();
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test('"Use a different email" returns to step 1 with the address kept', async ({ page }) => {
    const email = uniqueEmail('change');
    await requestCode(page, email);
    await page.getByRole('button', { name: 'Use a different email' }).click();
    const emailField = page.getByRole('textbox', { name: 'Email' });
    await expect(emailField).toBeFocused();
    await expect(emailField).toHaveValue(email);
    await expect(page.getByLabel('6-digit code')).toHaveCount(0);
  });

  test('resending is disabled while the countdown runs', async ({ page }) => {
    await requestCode(page, uniqueEmail('resend'));
    const resend = page.getByRole('button', { name: /Send again in \d+ s/ });
    await expect(resend).toBeVisible();
    await expect(resend).toBeDisabled();
  });

  test('too many requests for one address show the rate-limit message', async ({ page }) => {
    const email = uniqueEmail('limit');
    await page.goto('/en/auth/sign-in');
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const field = page.getByRole('textbox', { name: 'Email' });
      await field.fill(email);
      await page.getByRole('button', { name: 'Email me a sign-in code' }).click();
      if (attempt < 6) {
        await expect(
          page.getByRole('heading', { level: 2, name: 'Check your email' }),
        ).toBeVisible();
        // Auth allows one message per address per second.
        await page.waitForTimeout(1100);
        await page.getByRole('button', { name: 'Use a different email' }).click();
      }
    }
    await expect(
      page.getByRole('alert').filter({ hasText: 'Too many sign-in attempts' }),
    ).toBeVisible();
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`both steps pass axe and fit 320px in ${scheme} theme`, async ({
      page,
      context,
      baseURL,
    }) => {
      const host = new URL(baseURL ?? 'http://127.0.0.1:3003').hostname;
      await context.addCookies([{ name: 'fc-theme', value: scheme, domain: host, path: '/' }]);
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: 320, height: 640 });

      await page.goto('/en/auth/sign-in');
      await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
      await expectNoSeriousAxeViolations(page);

      await requestCode(page, uniqueEmail(`axe-${scheme}`));
      await expect(page.getByLabel('6-digit code')).toBeVisible();
      await expectNoSeriousAxeViolations(page);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
