import { expect, test } from '@playwright/test';

import { loginAs } from './fixtures/auth';
import { FAMILY_A_ID, TEST_USERS } from './fixtures/constants';
import { isLocalE2eStackReady } from './fixtures/env';
import { familyMain } from './fixtures/main';

test.describe('saved values stay visible after saving', () => {
  test.beforeAll(async () => {
    if (!(await isLocalE2eStackReady())) {
      test.skip();
    }
  });

  test('family settings keep the chosen language once saved', async ({ page, baseURL }) => {
    await loginAs(page, TEST_USERS.ownerA, baseURL);
    await page.goto(`/en/f/${FAMILY_A_ID}/settings`);
    const select = familyMain(page).getByLabel('Default recipe language');
    const original = await select.inputValue();
    const other = original === 'fi' ? 'ru' : 'fi';

    try {
      await select.selectOption(other);
      await page.getByRole('button', { name: 'Save settings' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Settings saved.' })).toBeVisible();
      // The refreshed page must not flash the old value back in.
      await page.waitForTimeout(1000);
      await expect(select).toHaveValue(other);
      await page.reload();
      await expect(familyMain(page).getByLabel('Default recipe language')).toHaveValue(other);
    } finally {
      // Leave the seeded family as the next run expects it.
      await page.goto(`/en/f/${FAMILY_A_ID}/settings`);
      await familyMain(page).getByLabel('Default recipe language').selectOption(original);
      await page.getByRole('button', { name: 'Save settings' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Settings saved.' })).toBeVisible();
    }
  });
});
