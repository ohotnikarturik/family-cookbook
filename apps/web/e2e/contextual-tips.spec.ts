import { expect, test, type Page } from '@playwright/test';

import { expectNoSeriousAxeViolations } from './fixtures/axe';
import { loginAs } from './fixtures/auth';
import { FAMILY_A_ID, RECIPE_ACTIVE_ID, TEST_USERS } from './fixtures/constants';
import { isLocalE2eStackReady } from './fixtures/env';

const familyA = `/en/f/${FAMILY_A_ID}`;
const invitations = `${familyA}/settings/invitations`;
const newRecipe = `${familyA}/recipes/new`;
const detail = `${familyA}/recipes/${RECIPE_ACTIVE_ID}`;
const NARROW = { width: 320, height: 640 };

const ROLE_HINTS = {
  viewer: 'Can read recipes but not change them.',
  editor: 'Can add and edit all family recipes.',
} as const;
const SOURCE_LANGUAGE_HINT = 'The language you are writing in — not the app language.';

async function expectNoSidewaysScroll(page: Page, width: number) {
  const overflow = await page.evaluate(
    (limit) => document.documentElement.scrollWidth > limit + 1,
    width,
  );
  expect(overflow).toBe(false);
}

/** Dialogs fade in; axe would measure half-transparent colours mid-animation. */
async function settleAnimations(page: Page) {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== 'running'),
  );
}

function inviteForm(page: Page) {
  return page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Send invitation' }) });
}

/** Opens the More menu on the recipe page and the archive dialog, without archiving. */
async function openArchiveDialog(page: Page) {
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('menuitem', { name: 'Archive recipe' }).click();
  const dialog = page.getByRole('dialog', { name: 'Archive this recipe?' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('W38.7 contextual tips', () => {
  test.beforeAll(async () => {
    if (!(await isLocalE2eStackReady())) {
      test.skip();
    }
  });

  test.beforeEach(async ({ page, baseURL }) => {
    await loginAs(page, TEST_USERS.ownerA, baseURL);
  });

  test('invite form explains the chosen role and lists every role on request', async ({ page }) => {
    await page.goto(invitations);
    const form = inviteForm(page);
    const role = form.getByRole('combobox', { name: 'Role' });
    await expect(role).toHaveAccessibleDescription(ROLE_HINTS.viewer);
    await role.selectOption({ label: 'Editor' });
    await expect(role).toHaveAccessibleDescription(ROLE_HINTS.editor);

    const details = form.locator('details');
    const summary = form.getByText('What can each role do?', { exact: true });
    await expect(details).not.toHaveAttribute('open', /.*/);
    await role.focus();
    await page.keyboard.press('Tab');
    await expect(summary).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(details).toHaveAttribute('open', '');

    const optionCount = await role.locator('option').count();
    const list = details.locator('dl');
    await expect(list.locator('dt')).toHaveCount(optionCount);
    await expect(list).toContainText('Viewer');
    await expect(list).toContainText(ROLE_HINTS.viewer);
  });

  test('editor explains source language and keeps the longer note out of the description', async ({
    page,
  }) => {
    await page.goto(newRecipe);
    const language = page.getByRole('combobox', { name: 'Original language' });
    await expect(language).toHaveAccessibleDescription(SOURCE_LANGUAGE_HINT);
    await expect(page.getByRole('textbox', { name: 'Amount' }).first()).toHaveAccessibleDescription(
      /such as 2, 1\.5 or 1 1\/2/,
    );

    const more = page.getByText('What is this?', { exact: true });
    await more.click();
    await expect(
      page.getByText(/added later on the recipe page: open More, then Translations/),
    ).toBeVisible();
    await more.click();
    await expect(page.getByText(/added later on the recipe page/)).toBeHidden();
  });

  test('archive dialog explains archive versus delete and Cancel archives nothing', async ({
    page,
  }) => {
    await page.goto(detail);
    const dialog = await openArchiveDialog(page);
    const summary = dialog.getByText('How is this different from deleting?', { exact: true });
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(dialog.getByText(/Recipes are never deleted here\./)).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Archived', { exact: true })).toHaveCount(0);
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`tips pass axe when open in ${scheme} and fit 320px`, async ({
      page,
      context,
      baseURL,
    }) => {
      const host = new URL(baseURL ?? 'http://127.0.0.1:3003').hostname;
      await context.addCookies([{ name: 'fc-theme', value: scheme, domain: host, path: '/' }]);
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize(NARROW);

      await page.goto(invitations);
      await inviteForm(page).getByText('What can each role do?', { exact: true }).click();
      await expect(inviteForm(page).locator('details')).toHaveAttribute('open', '');
      await expectNoSeriousAxeViolations(page);
      await expectNoSidewaysScroll(page, NARROW.width);

      await page.goto(newRecipe);
      await page.getByText('What is this?', { exact: true }).click();
      await expect(page.getByText(/open More, then Translations/)).toBeVisible();
      await expectNoSeriousAxeViolations(page);
      await expectNoSidewaysScroll(page, NARROW.width);

      await page.goto(detail);
      const dialog = await openArchiveDialog(page);
      await dialog.getByText('How is this different from deleting?', { exact: true }).click();
      await expect(dialog.getByText(/Recipes are never deleted here\./)).toBeVisible();
      await settleAnimations(page);
      await expectNoSeriousAxeViolations(page);
      await expectNoSidewaysScroll(page, NARROW.width);
      await dialog.getByRole('button', { name: 'Cancel' }).click();
    });
  }
});
