import { expect, test } from '@playwright/test';

import { expectNoSeriousAxeViolations } from './fixtures/axe';
import { loginAs } from './fixtures/auth';
import { FAMILY_A_ID, RECIPE_ACTIVE_ID, TEST_USERS } from './fixtures/constants';
import { isLocalE2eStackReady } from './fixtures/env';

test.describe('critical routes a11y (axe)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    if (!(await isLocalE2eStackReady())) {
      test.skip();
    }
  });

  test.beforeEach(async ({ page, baseURL }) => {
    await loginAs(page, TEST_USERS.ownerA, baseURL);
  });

  test('recipe browse', async ({ page }) => {
    await page.goto(`/en/f/${FAMILY_A_ID}/recipes`);
    await expect(page.getByRole('heading', { name: 'Recipes', level: 2 })).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });

  test('recipe detail', async ({ page }) => {
    await page.goto(`/en/f/${FAMILY_A_ID}/recipes/${RECIPE_ACTIVE_ID}`);
    await expect(
      page.getByRole('heading', { name: "Grandma's cardamom buns", level: 2 }),
    ).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });

  test('family members', async ({ page }) => {
    await page.goto(`/en/f/${FAMILY_A_ID}/settings/members`);
    await expect(page.getByRole('heading', { name: 'Family members', level: 2 })).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });

  test('family settings', async ({ page }) => {
    await page.goto(`/en/f/${FAMILY_A_ID}/settings`);
    await expect(page.getByRole('heading', { name: 'Family settings', level: 2 })).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });

  test('invitations', async ({ page }) => {
    await page.goto(`/en/f/${FAMILY_A_ID}/settings/invitations`);
    await expect(page.getByRole('heading', { name: 'Invite relatives', level: 2 })).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });
});
