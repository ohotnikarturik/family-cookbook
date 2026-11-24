import { expect, test, type Page } from '@playwright/test';

import { expectNoSeriousAxeViolations } from './fixtures/axe';
import { loginAs } from './fixtures/auth';
import { FAMILY_A_ID, TEST_USERS } from './fixtures/constants';
import { isLocalE2eStackReady } from './fixtures/env';
import { familyMain } from './fixtures/main';

/**
 * W38.8 read-only checks: who is offered "Leave family", the confirmation, and the page shown
 * to someone with no access. The journeys that change membership are in membership-changes.spec.ts.
 */

const settings = `/en/f/${FAMILY_A_ID}/settings`;
const NARROW = { width: 320, height: 640 };
const DESKTOP = { width: 1280, height: 900 };
const NO_ACCESS = 'You do not have access to this family';

async function settleAnimations(page: Page) {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== 'running'),
  );
}

test.describe('W38.8 leave family: what each role sees', () => {
  test.beforeAll(async () => {
    if (!(await isLocalE2eStackReady())) {
      test.skip();
    }
  });

  test('the owner is pointed to ownership transfer instead of a Leave button', async ({
    page,
    baseURL,
  }) => {
    await loginAs(page, TEST_USERS.ownerA, baseURL);
    await page.goto(settings);
    const main = familyMain(page);
    await expect(main.getByRole('heading', { level: 2, name: 'Leave this family' })).toBeVisible();
    await expect(main.getByText('Transfer ownership to another member first.')).toBeVisible();
    await expect(main.getByRole('button', { name: /^Leave family/ })).toHaveCount(0);
    await main.getByRole('link', { name: 'Go to members' }).click();
    await expect(page).toHaveURL(/\/settings\/members$/);
  });

  test('a viewer can cancel the confirmation, which explains what happens', async ({
    page,
    baseURL,
  }) => {
    await loginAs(page, TEST_USERS.viewerA, baseURL);
    await page.goto(settings);
    await familyMain(page).getByRole('button', { name: 'Leave family…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Leave Andersen Test Kitchen?' });
    await expect(dialog).toContainText('The recipes you added stay with the family.');
    await expect(dialog).toContainText('An owner or admin can invite you back later.');
    await expect(dialog.getByRole('button', { name: 'Leave family' })).toBeEnabled();
    await settleAnimations(page);
    await expectNoSeriousAxeViolations(page);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/settings$/);
  });

  test('someone who is not a member gets one clear no-access page', async ({ page, baseURL }) => {
    await loginAs(page, TEST_USERS.ownerC, baseURL);
    for (const familyId of [FAMILY_A_ID, '99999999-9999-4999-8999-999999999999']) {
      await page.goto(`/en/f/${familyId}`);
      await expect(page.getByRole('heading', { level: 1, name: NO_ACCESS })).toBeVisible();
      await expect(page.getByRole('link', { name: 'See my families' })).toBeVisible();
    }
    await expectNoSeriousAxeViolations(page);
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`settings and no-access pass axe in ${scheme} and fit 320px`, async ({
      page,
      context,
      baseURL,
    }) => {
      const host = new URL(baseURL ?? 'http://127.0.0.1:3003').hostname;
      await context.addCookies([{ name: 'fc-theme', value: scheme, domain: host, path: '/' }]);
      await page.emulateMedia({ colorScheme: scheme });
      await loginAs(page, TEST_USERS.viewerA, baseURL);
      for (const size of [NARROW, DESKTOP]) {
        await page.setViewportSize(size);
        await page.goto(settings);
        await expect(familyMain(page).getByRole('button', { name: 'Leave family…' })).toBeVisible();
        await expectNoSeriousAxeViolations(page);
        const overflow = await page.evaluate(
          (limit) => document.documentElement.scrollWidth > limit + 1,
          size.width,
        );
        expect(overflow).toBe(false);

        await page.goto(`/en/f/${'99999999-9999-4999-8999-999999999999'}`);
        await expect(page.getByRole('heading', { level: 1, name: NO_ACCESS })).toBeVisible();
        await expectNoSeriousAxeViolations(page);
      }
    });
  }
});
