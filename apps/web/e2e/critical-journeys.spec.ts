import { expect, test } from '@playwright/test';

import { loginAs } from './fixtures/auth';
import { FAMILY_A_ID, FAMILY_B_ID, RECIPE_ARCHIVED_ID, TEST_USERS } from './fixtures/constants';
import { isLocalE2eStackReady } from './fixtures/env';

const familyRecipesPath = (familyId: string) => `/en/f/${familyId}/recipes`;

test.describe('critical journeys', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    if (!(await isLocalE2eStackReady())) {
      test.skip();
    }
  });

  test.beforeEach(async ({ page, baseURL }) => {
    await loginAs(page, TEST_USERS.ownerA, baseURL);
  });

  test('owner browses recipes and filters archived results', async ({ page }) => {
    await page.goto(familyRecipesPath(FAMILY_A_ID));
    await expect(page.getByRole('heading', { name: 'Recipes', level: 2 })).toBeVisible();

    await expect(page.getByRole('link', { name: "Grandma's cardamom buns" })).toBeVisible();

    await page.getByRole('checkbox', { name: 'Include archived recipes' }).check();
    await page.getByRole('searchbox', { name: 'Search', exact: true }).fill('beet');
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await expect(page.getByRole('link', { name: 'Archived beet salad' })).toBeVisible();

    await page.getByRole('searchbox', { name: 'Search', exact: true }).fill('salmon');
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await expect(page.getByRole('link', { name: 'Weeknight salmon soup' })).toBeVisible();
  });

  test('owner opens members, settings, and invitations', async ({ page }) => {
    await page.goto(`/en/f/${FAMILY_A_ID}/settings/members`);
    await expect(page.getByRole('heading', { name: 'Family members', level: 2 })).toBeVisible();
    const signedInMember = page.getByRole('listitem').filter({ hasText: 'You' });
    await expect(signedInMember.getByText('Owner', { exact: true })).toBeVisible();

    await page.goto(`/en/f/${FAMILY_A_ID}/settings`);
    await expect(page.getByRole('heading', { name: 'Family settings', level: 2 })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Family name' })).toBeVisible();

    await page.goto(`/en/f/${FAMILY_A_ID}/settings/invitations`);
    await expect(page.getByRole('heading', { name: 'Invite relatives', level: 2 })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
  });

  test('owner creates a recipe', async ({ page }) => {
    const title = `E2E soup ${Date.now()}`;
    await page.goto(`/en/f/${FAMILY_A_ID}/recipes/new`);
    await expect(page.getByRole('heading', { name: 'Add a recipe', level: 2 })).toBeVisible();

    await page.getByRole('textbox', { name: 'Recipe title', exact: true }).fill(title);
    await page.getByRole('textbox', { name: 'Ingredient', exact: true }).first().fill('water');
    await page
      .getByRole('textbox', { name: 'Instruction', exact: true })
      .first()
      .fill('Simmer gently.');
    await page.getByRole('button', { name: 'Save recipe' }).click();

    await expect(page).toHaveURL(new RegExp(`/en/f/${FAMILY_A_ID}/recipes/[0-9a-f-]+$`), {
      timeout: 30_000,
    });
    await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Recipe saved.' })).toBeVisible();
  });

  test('owner restores an archived recipe and edit view supports uploads', async ({ page }) => {
    await page.goto(`/en/f/${FAMILY_A_ID}/recipes/${RECIPE_ARCHIVED_ID}`);
    await expect(
      page.getByRole('heading', { name: 'Archived beet salad', level: 2 }),
    ).toBeVisible();
    const restoreButton = page.getByRole('button', { name: 'Restore recipe' });
    if (await restoreButton.isVisible()) {
      await restoreButton.click();
      await expect(page.getByRole('button', { name: 'Archive recipe' })).toBeVisible({
        timeout: 15_000,
      });
    }

    await page.goto(`/en/f/${FAMILY_A_ID}/recipes/${RECIPE_ARCHIVED_ID}/edit`);
    await expect(
      page.getByRole('heading', { name: 'Add photos or sources', level: 3 }),
    ).toBeVisible();
  });
});

test.describe('critical journeys — family switch', () => {
  test.beforeAll(async () => {
    if (!(await isLocalE2eStackReady())) {
      test.skip();
    }
  });

  test('multi-family member switches workspaces', async ({ page, baseURL }) => {
    await loginAs(page, TEST_USERS.multi, baseURL);
    await page.goto(`/en/f/${FAMILY_A_ID}/recipes`);
    await expect(page.getByLabel('Active family')).toBeVisible();

    await page.locator('#family-shell-switcher').selectOption(FAMILY_B_ID);
    await expect(page).toHaveURL(new RegExp(`/en/f/${FAMILY_B_ID}(?:/|$)`), { timeout: 15_000 });
    await expect(page.locator('#family-shell-switcher')).toHaveValue(FAMILY_B_ID);
    await expect(page.locator('#family-shell-switcher option:checked')).toHaveText(
      'Berg Test Pantry',
    );
  });
});

test.describe('critical journeys — mobile', () => {
  test.beforeAll(async () => {
    if (!(await isLocalE2eStackReady())) {
      test.skip();
    }
  });

  test('recipe list is usable on a narrow viewport', async ({ page, baseURL }) => {
    await loginAs(page, TEST_USERS.ownerA, baseURL);
    await page.goto(familyRecipesPath(FAMILY_A_ID));
    await expect(page.getByRole('heading', { name: 'Recipes', level: 2 })).toBeVisible();
    await expect(page.getByRole('link', { name: "Grandma's cardamom buns" })).toBeVisible();

    const horizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2,
    );
    expect(horizontalScroll).toBe(false);
  });
});
