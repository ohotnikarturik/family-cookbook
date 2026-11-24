import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';

import { expectNoSeriousAxeViolations } from './fixtures/axe';
import { loginAs } from './fixtures/auth';
import { FAMILY_A_ID, RECIPE_ACTIVE_ID, TEST_USERS } from './fixtures/constants';
import { isLocalE2eStackReady } from './fixtures/env';
import { familyMain } from './fixtures/main';

/**
 * W38.20: a button that saves, sends or applies is disabled while pressing it would change
 * nothing, and visible text says why. None of these tests saves anything, except the Account
 * page check, which puts the language and theme back.
 */

const familyA = `/en/f/${FAMILY_A_ID}`;
const NARROW = { width: 320, height: 800 };
const UNCHANGED = 'Change something to save.';
const REASON = '[data-disabled-reason]';

async function setScheme(
  page: Page,
  context: BrowserContext,
  baseURL: string | undefined,
  scheme: 'light' | 'dark',
): Promise<void> {
  const host = new URL(baseURL ?? 'http://127.0.0.1:3003').hostname;
  await context.addCookies([{ name: 'fc-theme', value: scheme, domain: host, path: '/' }]);
  await page.emulateMedia({ colorScheme: scheme });
}

async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    (width) => document.documentElement.scrollWidth > width + 1,
    NARROW.width,
  );
  expect(overflow).toBe(false);
}

async function expectBlocked(button: Locator, scope: Locator, reason: string): Promise<void> {
  await expect(button).toBeDisabled();
  await expect(scope.locator(REASON).filter({ hasText: reason, visible: true })).toBeVisible();
}

async function expectReady(button: Locator, scope: Locator): Promise<void> {
  await expect(button).toBeEnabled();
  await expect(scope.locator(REASON).filter({ visible: true })).toHaveCount(0);
}

test.describe('buttons that would do nothing are disabled', () => {
  test.beforeAll(async () => {
    if (!(await isLocalE2eStackReady())) {
      test.skip();
    }
  });

  test.describe('signed in as the owner', () => {
    test.beforeEach(async ({ page, baseURL }) => {
      await loginAs(page, TEST_USERS.ownerA, baseURL);
    });

    test('family settings: Save waits for a change and goes back when it is reverted', async ({
      page,
    }) => {
      await page.goto(`${familyA}/settings`);
      const main = familyMain(page);
      const save = main.getByRole('button', { name: 'Save settings' });
      const name = main.getByLabel('Family name');
      await expectBlocked(save, main, UNCHANGED);
      await expect(main.getByText('(required)')).toBeVisible();

      const original = await name.inputValue();
      await name.fill(`${original} 2`);
      await expectReady(save, main);
      await name.fill(original);
      await expectBlocked(save, main, UNCHANGED);

      const language = main.getByLabel('Default recipe language');
      const originalLanguage = await language.inputValue();
      await language.selectOption(originalLanguage === 'fi' ? 'ru' : 'fi');
      await expectReady(save, main);
      await language.selectOption(originalLanguage);
      await expectBlocked(save, main, UNCHANGED);
    });

    test('recipe editor: Save waits for a change when editing', async ({ page }) => {
      await page.goto(`${familyA}/recipes/${RECIPE_ACTIVE_ID}/edit`);
      const save = page.getByRole('button', { name: 'Save recipe' });
      const scope = page.locator('body');
      const title = page.getByRole('textbox', { name: 'Recipe title', exact: true });
      await expectBlocked(save, scope, UNCHANGED);

      const original = await title.inputValue();
      await title.fill(`${original}!`);
      await expectReady(save, scope);
      await title.fill(original);
      await expectBlocked(save, scope, UNCHANGED);
    });

    test('recipe editor: a new recipe needs a title', async ({ page }) => {
      await page.goto(`${familyA}/recipes/new`);
      const save = page.getByRole('button', { name: 'Save recipe' });
      const scope = page.locator('body');
      const title = page.getByRole('textbox', { name: 'Recipe title', exact: true });
      await expectBlocked(save, scope, 'Add a title to save.');
      await expect(page.getByText('(required)').first()).toBeVisible();

      await title.fill('   ');
      await expectBlocked(save, scope, 'Add a title to save.');
      await title.fill('Pancakes');
      await expectReady(save, scope);
      await title.fill('');
      await expectBlocked(save, scope, 'Add a title to save.');
    });

    test('translation form: Save waits for a change', async ({ page }) => {
      await page.goto(`${familyA}/recipes/${RECIPE_ACTIVE_ID}/translations/ru`);
      const main = familyMain(page);
      const save = main.getByRole('button', { name: 'Save translation' });
      const title = main.getByRole('textbox', { name: 'Translated title' });
      await expectBlocked(save, main, UNCHANGED);

      await title.fill('Тест');
      await expectReady(save, main);
      await title.fill('');
      await expectBlocked(save, main, UNCHANGED);
    });

    test('invite form: Send waits for an email address', async ({ page }) => {
      await page.goto(`${familyA}/settings/invitations`);
      const main = familyMain(page);
      const send = main.getByRole('button', { name: 'Send invitation' });
      await expectBlocked(send, main, 'Enter an email address to continue.');
      await expect(main.getByText('(required)')).toBeVisible();

      await main.getByLabel('Email address').fill('someone@family-cookbook.test');
      await expectReady(send, main);
      await main.getByLabel('Email address').fill('');
      await expectBlocked(send, main, 'Enter an email address to continue.');
    });

    test('recipes: Clear filters waits for a search or filter', async ({ page }) => {
      await page.goto(`${familyA}/recipes`);
      await page.getByRole('button', { name: 'Filters', exact: true }).click();
      const panel = page
        .locator('form')
        .filter({ has: page.getByRole('button', { name: 'Filters', exact: true }) });
      await expectBlocked(
        panel.getByRole('button', { name: 'Clear filters' }),
        panel,
        'No filters are applied.',
      );

      await page.goto(`${familyA}/recipes?category=Baking`);
      await page.getByRole('button', { name: 'Filters', exact: true }).click();
      const clear = panel.getByRole('link', { name: 'Clear filters' });
      await expect(clear).toBeVisible();
      await expect(panel.locator(REASON).filter({ visible: true })).toHaveCount(0);

      await clear.click();
      await expect(page).toHaveURL(/\/recipes$/);
      await expectBlocked(
        panel.getByRole('button', { name: 'Clear filters' }),
        panel,
        'No filters are applied.',
      );
    });

    test('recipe editor: Add to list waits for ingredient text', async ({ page }) => {
      await page.goto(`${familyA}/recipes/new`);
      await page.getByRole('button', { name: 'Add several at once' }).click();
      const add = page.getByRole('button', { name: 'Add to list' });
      const scope = page.locator('body');
      await expectBlocked(add, scope, 'Type at least one ingredient.');
      await page.getByRole('textbox', { name: 'Ingredients, one per line' }).fill('2 eggs');
      await expect(add).toBeEnabled();
    });

    test('account: the name has a Save button; language and appearance apply at once', async ({
      page,
    }) => {
      await page.goto('/en/account');
      const save = page.getByRole('button', { name: 'Save name' });
      const scope = page.locator('body');
      const name = page.getByRole('textbox', { name: 'Display name' });
      await expectBlocked(save, scope, UNCHANGED);

      const original = await name.inputValue();
      await name.fill(`${original} x`);
      await expectReady(save, scope);
      await name.fill(original);
      await expectBlocked(save, scope, UNCHANGED);

      // No Save for appearance: choosing it changes the page straight away and it is saved.
      await expect(page.getByRole('button', { name: /save (preferences|settings)/i })).toHaveCount(
        0,
      );
      const dark = page.getByRole('radio', { name: 'Dark', exact: true });
      const system = page.getByRole('radio', { name: 'System', exact: true });
      try {
        await dark.check();
        await expect(page.locator('html')).toHaveClass(/dark/);
        await expect(save).toBeDisabled();
      } finally {
        await system.check();
      }
    });
  });

  test.describe('signed out', () => {
    test('sign-in: Send waits for an email, Verify waits for six digits', async ({ page }) => {
      await page.goto('/en/auth/sign-in');
      const form = page
        .locator('form')
        .filter({ has: page.getByRole('textbox', { name: 'Email' }) });
      const send = page.getByRole('button', { name: 'Send me a sign-in email' });
      await expectBlocked(send, form, 'Enter an email address to continue.');

      await page.getByRole('textbox', { name: 'Email' }).fill('nobody@family-cookbook.test');
      await expectReady(send, form);
      await page.getByRole('textbox', { name: 'Email' }).fill('');
      await expectBlocked(send, form, 'Enter an email address to continue.');
    });
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`disabled buttons and their reasons pass axe in ${scheme} theme at 320px`, async ({
      page,
      context,
      baseURL,
    }) => {
      await loginAs(page, TEST_USERS.ownerA, baseURL);
      await setScheme(page, context, baseURL, scheme);
      await page.setViewportSize(NARROW);

      for (const path of [
        `${familyA}/settings`,
        `${familyA}/recipes/new`,
        `${familyA}/recipes/${RECIPE_ACTIVE_ID}/edit`,
        `${familyA}/settings/invitations`,
        '/en/account',
      ]) {
        await page.goto(path);
        await expect(page.locator(REASON).filter({ visible: true }).first()).toBeVisible();
        await expectNoSidewaysScroll(page);
        await expectNoSeriousAxeViolations(page);
      }

      // The filter panel with nothing applied: Clear filters disabled, with its reason.
      await page.goto(`${familyA}/recipes`);
      await page.getByRole('button', { name: 'Filters', exact: true }).click();
      await expect(page.getByText('No filters are applied.')).toBeVisible();
      await expectNoSidewaysScroll(page);
      await expectNoSeriousAxeViolations(page);
    });
  }
});
