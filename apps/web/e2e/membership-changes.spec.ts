import { expect, test, type Page } from '@playwright/test';

import { loginAs } from './fixtures/auth';
import { FAMILY_A_ID, TEST_USERS } from './fixtures/constants';
import { isLocalE2eStackReady } from './fixtures/env';
import { familyMain } from './fixtures/main';

/**
 * W38.8 journeys that change who belongs to Family A and put it back, so this file runs alone in
 * its own project after the others (see playwright.config.ts). Do not rename it without updating
 * MEMBERSHIP_SPEC there.
 */

const familyA = `/en/f/${FAMILY_A_ID}`;
const MAILPIT = process.env['MAILPIT_URL'] ?? 'http://127.0.0.1:54324';
const NO_ACCESS = 'You do not have access to this family';

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  if (!(await isLocalE2eStackReady())) {
    test.skip();
  }
});

function memberRow(page: Page, name: string) {
  return familyMain(page)
    .getByRole('listitem')
    .filter({ has: page.getByText(name, { exact: true }) });
}

/** The accept link in the newest invitation email for `email` sent after `since`. */
async function readInviteLink(email: string, since: number): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(
      async () => {
        const search = await fetch(
          `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`,
        );
        if (!search.ok) return false;
        const body = (await search.json()) as { messages?: { ID: string; Created: string }[] };
        const fresh = (body.messages ?? []).find((m) => Date.parse(m.Created) >= since - 5_000);
        if (!fresh) return false;
        const message = await fetch(`${MAILPIT}/api/v1/message/${fresh.ID}`);
        if (!message.ok) return false;
        const text = ((await message.json()) as { Text: string }).Text;
        const match = /https?:\/\/[^\s<>"]+\/invite\/accept\?token=[^\s<>"]+/.exec(text);
        link = match?.[0];
        return link !== undefined;
      },
      { timeout: 30_000, message: `No invitation email in Mailpit for ${email}` },
    )
    .toBe(true);
  if (!link) throw new Error('unreachable');
  const url = new URL(link);
  return `${url.pathname}${url.search}`;
}

test('a member leaves, disappears from the member list, and rejoins with a new invitation', async ({
  browser,
  baseURL,
}) => {
  test.slow();
  const owner = await browser.newPage();
  const viewer = await browser.newPage();
  await loginAs(owner, TEST_USERS.ownerA, baseURL);
  await loginAs(viewer, TEST_USERS.viewerA, baseURL);

  await owner.goto(`${familyA}/settings/members`);
  await expect(memberRow(owner, 'Viewer A')).toContainText('Viewer · Active');

  // Leave.
  await viewer.goto(`${familyA}/settings`);
  await familyMain(viewer).getByRole('button', { name: 'Leave family…' }).click();
  const dialog = viewer.getByRole('dialog', { name: 'Leave Andersen Test Kitchen?' });
  await dialog.getByRole('button', { name: 'Leave family', exact: true }).click();
  await expect(viewer).toHaveURL(/\/en\/families$/, { timeout: 30_000 });

  // The old address now says there is no access, and the owner no longer lists them.
  await viewer.goto(familyA);
  await expect(viewer.getByRole('heading', { level: 1, name: NO_ACCESS })).toBeVisible();
  await owner.goto(`${familyA}/settings/members`);
  await expect(memberRow(owner, 'Viewer A')).toHaveCount(0);

  // Rejoin through a fresh invitation (restores the seeded state).
  const sentAt = Date.now();
  await owner.goto(`${familyA}/settings/invitations`);
  await owner.getByRole('textbox', { name: 'Email address' }).fill(TEST_USERS.viewerA);
  await owner.getByRole('combobox', { name: 'Role' }).selectOption({ label: 'Viewer' });
  await owner.getByRole('button', { name: 'Send invitation' }).click();
  await expect(owner.getByText('Invitation email sent.')).toBeVisible({ timeout: 30_000 });

  const link = await readInviteLink(TEST_USERS.viewerA, sentAt);
  await viewer.goto(link);
  await viewer.getByRole('button', { name: 'Accept invitation' }).click();
  await expect(viewer).toHaveURL(/\/en\/(f\/|families)/, { timeout: 30_000 });

  await viewer.goto(familyA);
  await expect(
    viewer.getByRole('heading', { level: 1, name: 'Andersen Test Kitchen' }),
  ).toBeVisible();
  await owner.goto(`${familyA}/settings/members`);
  await expect(memberRow(owner, 'Viewer A')).toContainText('Viewer · Active');

  await owner.close();
  await viewer.close();
});

test('a suspended member sees that their access is paused, and can return once reactivated', async ({
  browser,
  baseURL,
}) => {
  test.slow();
  const owner = await browser.newPage();
  const editor = await browser.newPage();
  await loginAs(owner, TEST_USERS.ownerA, baseURL);
  await loginAs(editor, TEST_USERS.editorA, baseURL);

  await owner.goto(`${familyA}/settings/members`);
  const row = memberRow(owner, 'Editor A');
  await row.getByRole('button', { name: 'Change Editor A' }).click();
  await owner
    .getByRole('dialog', { name: 'Change Editor A' })
    .getByRole('button', { name: 'Suspend member' })
    .click();
  await expect(row).toContainText('Suspended', { timeout: 15_000 });

  try {
    await editor.goto(familyA);
    await expect(
      editor.getByRole('heading', { level: 1, name: 'Your access is paused' }),
    ).toBeVisible();
    await expect(editor.getByRole('link', { name: 'See my families' })).toBeVisible();
  } finally {
    await row.getByRole('button', { name: 'Change Editor A' }).click();
    await owner
      .getByRole('dialog', { name: 'Change Editor A' })
      .getByRole('button', { name: 'Reactivate member' })
      .click();
    await expect(row).toContainText('Active', { timeout: 15_000 });
  }

  await editor.goto(familyA);
  await expect(
    editor.getByRole('heading', { level: 1, name: 'Andersen Test Kitchen' }),
  ).toBeVisible();

  await owner.close();
  await editor.close();
});
