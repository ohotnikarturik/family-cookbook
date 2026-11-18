import { expect, test, type Page } from '@playwright/test';

import { expectNoSeriousAxeViolations } from './fixtures/axe';
import { loginAs } from './fixtures/auth';
import { FAMILY_A_ID, RECIPE_ACTIVE_ID, TEST_USERS } from './fixtures/constants';
import { isLocalE2eStackReady } from './fixtures/env';
import { archiveRecipeFromDetail } from './fixtures/recipe-lifecycle';

const familyA = `/en/f/${FAMILY_A_ID}`;
const history = `${familyA}/recipes/${RECIPE_ACTIVE_ID}/history`;
const translations = `${familyA}/recipes/${RECIPE_ACTIVE_ID}/translations`;
const members = `${familyA}/settings/members`;
const NARROW = { width: 320, height: 640 };
const DESKTOP = { width: 1280, height: 900 };

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

/** The member row for a display name ("You" for the signed-in member). */
function memberRow(page: Page, name: string) {
  return page
    .getByRole('listitem')
    .filter({ has: page.getByText(name, { exact: true }) })
    .first();
}

test.describe('W38.17 calmer confirmations', () => {
  test.beforeAll(async () => {
    if (!(await isLocalE2eStackReady())) {
      test.skip();
    }
  });

  test.describe('as owner', () => {
    test.beforeEach(async ({ page, baseURL }) => {
      await loginAs(page, TEST_USERS.ownerA, baseURL);
    });

    test('archive asks once, without a checkbox, and restore brings it back', async ({ page }) => {
      // Create, archive, restore and archive again: four server round trips in dev mode.
      test.slow();
      const title = `E2E archive ${Date.now()}`;
      await page.goto(`${familyA}/recipes/new`);
      await page.getByRole('textbox', { name: 'Recipe title', exact: true }).fill(title);
      await page.getByRole('textbox', { name: 'Ingredient', exact: true }).first().fill('water');
      await page.getByRole('textbox', { name: 'Step 1', exact: true }).fill('Boil.');
      await page.getByRole('button', { name: 'Save recipe' }).click();
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible({
        timeout: 30_000,
      });

      await page.getByRole('button', { name: 'More' }).click();
      await page.getByRole('menuitem', { name: 'Archive recipe' }).click();
      const dialog = page.getByRole('dialog', { name: 'Archive this recipe?' });
      await expect(dialog).toContainText('Nothing is deleted');
      await expect(dialog.getByRole('checkbox')).toHaveCount(0);
      const confirm = dialog.getByRole('button', { name: 'Archive', exact: true });
      await expect(confirm).toBeEnabled();
      await expect(confirm).not.toHaveClass(/bg-destructive/);
      await settleAnimations(page);
      await expectNoSeriousAxeViolations(page);
      await confirm.click();

      const restore = page.getByRole('button', { name: 'Restore recipe' });
      await expect(restore).toBeVisible({ timeout: 15_000 });
      // Open the archived recipe fresh, as a person returning to it would, then restore.
      const detailUrl = page.url().replace(/\?.*$/, '');
      await page.goto(detailUrl, { waitUntil: 'networkidle' });
      await restore.click();
      // The button turns into "Restoring…" at once; wait for the result, not the label.
      await expect(page.getByText('Archived', { exact: true })).toHaveCount(0, {
        timeout: 15_000,
      });

      // Leave Family A as it was.
      await page.goto(detailUrl, { waitUntil: 'networkidle' });
      await expect(page.getByText('Archived', { exact: true })).toHaveCount(0);
      await archiveRecipeFromDetail(page);
    });

    test('history shows one Changes list and a collapsed Activity log', async ({ page }) => {
      await page.goto(history);
      await expect(page.getByRole('heading', { level: 1, name: 'Recipe history' })).toBeVisible();
      await expect(page.getByRole('heading', { level: 2, name: 'Changes' })).toBeVisible();
      const log = page.getByRole('group', { name: 'Activity log' });
      await expect(log).toBeVisible();
      await expect(log).not.toHaveAttribute('open', '');
      await expect(page.getByRole('navigation', { name: 'Activity log pages' })).toBeHidden();
      await log.locator('summary').click();
      await expect(log).toHaveAttribute('open', '');
    });

    test('one member list; Change opens a dialog that saves a new role', async ({ page }) => {
      await page.goto(members);
      await expect(page.getByRole('heading', { level: 1, name: 'Family members' })).toBeVisible();
      await expect(page.getByText('Manage roles and access')).toHaveCount(0);
      await expect(memberRow(page, 'You')).toContainText('Owner · Active');
      await expect(memberRow(page, 'You').getByRole('button', { name: /^Change/ })).toHaveCount(0);

      const row = memberRow(page, 'Multi Family');
      await expect(row).toContainText('Editor · Active');

      async function changeRole(from: string, to: string) {
        await row.getByRole('button', { name: 'Change Multi Family' }).click();
        const dialog = page.getByRole('dialog', { name: 'Change Multi Family' });
        const select = dialog.getByRole('combobox', { name: 'Role' });
        await expect(select.locator('option:checked')).toHaveText(from);
        await select.selectOption({ label: to });
        await expect(select).toHaveAccessibleDescription(
          to === 'Contributor'
            ? 'Can add recipes and edit the ones they added.'
            : 'Can add and edit all family recipes.',
        );
        await dialog.getByRole('button', { name: 'Save role' }).click();
        await expect(dialog).toBeHidden({ timeout: 15_000 });
        await expect(row).toContainText(`${to} · Active`, { timeout: 15_000 });
        await expect(row.getByRole('status')).toHaveText('Changes saved.');
      }

      await changeRole('Editor', 'Contributor');
      try {
        await row.getByRole('button', { name: 'Change Multi Family' }).click();
        const dialog = page.getByRole('dialog', { name: 'Change Multi Family' });
        await expect(dialog.getByRole('button', { name: 'Suspend member' })).toBeVisible();
        await settleAnimations(page);
        await expectNoSeriousAxeViolations(page);
        await dialog.getByRole('button', { name: 'Close' }).click();
        await expect(dialog).toBeHidden();
      } finally {
        await changeRole('Contributor', 'Editor');
      }
    });

    test('translations: rows with Edit and one Add translation button', async ({ page }) => {
      await page.goto(translations);
      await expect(
        page.getByRole('heading', { level: 1, name: 'Recipe translations' }),
      ).toBeVisible();
      const finnish = page.getByRole('listitem').filter({ hasText: 'Finnish' });
      await expect(finnish.getByRole('link', { name: 'Edit Finnish' })).toHaveText('Edit');
      await expect(page.getByRole('button', { name: 'Add translation' })).toHaveCount(1);

      await page.getByRole('button', { name: 'Add translation' }).click();
      const dialog = page.getByRole('dialog', { name: 'Add a translation' });
      await dialog.getByRole('combobox', { name: 'Language' }).selectOption({ label: 'Russian' });
      await dialog.getByRole('button', { name: 'Continue' }).click();
      await expect(page).toHaveURL(/\/translations\/ru$/, { timeout: 15_000 });
    });

    for (const scheme of ['light', 'dark'] as const) {
      test(`members, history and translations pass axe in ${scheme} and fit 320px`, async ({
        page,
        context,
        baseURL,
      }) => {
        const host = new URL(baseURL ?? 'http://127.0.0.1:3003').hostname;
        await context.addCookies([{ name: 'fc-theme', value: scheme, domain: host, path: '/' }]);
        await page.emulateMedia({ colorScheme: scheme });
        for (const size of [NARROW, DESKTOP]) {
          await page.setViewportSize(size);
          for (const path of [members, history, translations]) {
            await page.goto(path);
            await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
            await expectNoSeriousAxeViolations(page);
            if (size === NARROW) {
              await expectNoSidewaysScroll(page, NARROW.width);
            }
          }
        }
        await page.setViewportSize(NARROW);
        await page.goto(members);
        await memberRow(page, 'Multi Family')
          .getByRole('button', { name: 'Change Multi Family' })
          .click();
        await expect(page.getByRole('dialog', { name: 'Change Multi Family' })).toBeVisible();
        await settleAnimations(page);
        await expectNoSeriousAxeViolations(page);
        await expectNoSidewaysScroll(page, NARROW.width);
      });
    }
  });

  test.describe('as editor and viewer', () => {
    test('an editor sees Changes but no Activity log', async ({ page, baseURL }) => {
      await loginAs(page, TEST_USERS.editorA, baseURL);
      await page.goto(history);
      await expect(page.getByRole('heading', { level: 2, name: 'Changes' })).toBeVisible();
      await expect(page.getByText('Activity log')).toHaveCount(0);
    });

    test('a viewer sees the same member list without Change buttons', async ({ page, baseURL }) => {
      await loginAs(page, TEST_USERS.viewerA, baseURL);
      await page.goto(members);
      await expect(page.getByRole('heading', { level: 1, name: 'Family members' })).toBeVisible();
      await expect(memberRow(page, 'Multi Family')).toBeVisible();
      await expect(page.getByRole('button', { name: /^Change/ })).toHaveCount(0);
    });
  });
});
