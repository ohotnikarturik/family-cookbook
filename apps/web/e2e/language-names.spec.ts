import { expect, test } from '@playwright/test';

import { expectNoSeriousAxeViolations } from './fixtures/axe';
import { loginAs } from './fixtures/auth';
import { FAMILY_A_ID, RECIPE_ACTIVE_ID, TEST_USERS } from './fixtures/constants';
import { isLocalE2eStackReady } from './fixtures/env';

const family = `/en/f/${FAMILY_A_ID}`;
/** Seeded Finnish recipe with no translations (Karjalanpiirakat). */
const RECIPE_FINNISH_NO_TRANSLATIONS = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0106';

test.describe('language names instead of codes', () => {
  test.beforeAll(async () => {
    if (!(await isLocalE2eStackReady())) {
      test.skip();
    }
  });

  test.beforeEach(async ({ page, baseURL }) => {
    await loginAs(page, TEST_USERS.ownerA, baseURL);
  });

  test('a recipe with translations names every reading language', async ({ page }) => {
    await page.goto(`${family}/recipes/${RECIPE_ACTIVE_ID}`);
    const group = page.getByRole('radiogroup', { name: 'Reading language' });
    await expect(group).toBeVisible();
    await expect(group.getByRole('radio', { name: /Original \(English\)/ })).toBeVisible();
    await expect(group.getByRole('radio', { name: /Finnish/ })).toBeVisible();
    await expect(group.getByRole('radio', { name: /Ukrainian/ })).toBeVisible();
    await expect(group.getByRole('radio', { name: /^fi$|^uk$/ })).toHaveCount(0);
    await expectNoSeriousAxeViolations(page);
  });

  test('a recipe without translations has no reading-language selector', async ({ page }) => {
    await page.goto(`${family}/recipes/${RECIPE_FINNISH_NO_TRANSLATIONS}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Finnish', { exact: true })).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: 'Reading language' })).toHaveCount(0);
  });

  test('translation pages offer languages by name', async ({ page }) => {
    await page.goto(`${family}/recipes/${RECIPE_ACTIVE_ID}/translations`);
    await expect(page.getByRole('link', { name: 'Edit Finnish' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Edit Ukrainian' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Add Russian' })).toBeVisible();
  });

  test('the search filter picks a language by name and the chip shows it', async ({ page }) => {
    await page.goto(`${family}/recipes?language=fi`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /Recipe language: Finnish/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Recipe language: fi/ })).toHaveCount(0);
  });
});
