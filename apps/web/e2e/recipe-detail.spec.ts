import { expect, test } from '@playwright/test';

import { expectNoSeriousAxeViolations } from './fixtures/axe';
import { loginAs } from './fixtures/auth';
import { FAMILY_A_ID, RECIPE_ACTIVE_ID, TEST_USERS } from './fixtures/constants';
import { isLocalE2eStackReady } from './fixtures/env';
import { familyMain } from './fixtures/main';

const detail = `/en/f/${FAMILY_A_ID}/recipes/${RECIPE_ACTIVE_ID}`;
/** Seeded Ukrainian borscht: prep 30 min, cook 90 min, so the total is exactly 2 h. */
const RECIPE_BORSCHT = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0104';
const PHONE = { width: 320, height: 800 };
const DESKTOP = { width: 1280, height: 900 };

test.describe('recipe detail readability', () => {
  test.beforeAll(async () => {
    if (!(await isLocalE2eStackReady())) {
      test.skip();
    }
  });

  test.describe('as owner', () => {
    test.beforeEach(async ({ page, baseURL }) => {
      await loginAs(page, TEST_USERS.ownerA, baseURL);
    });

    test('shows facts as one row with hours and minutes', async ({ page }) => {
      await page.goto(detail);
      const facts = page.getByRole('list').filter({ hasText: 'Prep 45 min' });
      await expect(facts.getByRole('listitem')).toHaveText([
        'Prep 45 min',
        'Cook 25 min',
        'Total 1 h 10 min',
        'Serves 12',
      ]);
      await expect(familyMain(page).getByText('Prep (min)')).toHaveCount(0);

      await page.goto(`/en/f/${FAMILY_A_ID}/recipes/${RECIPE_BORSCHT}`);
      await expect(familyMain(page).getByText('Total 2 h', { exact: true })).toBeVisible();
    });

    test('names the author and the update date, never an email', async ({ page }) => {
      await page.goto(detail);
      const line = familyMain(page).getByText(/^Added by .+ · Updated /);
      await expect(line).toBeVisible();
      await expect(line).not.toContainText('@');
    });

    test('lists ingredients in one list with the amount in its own column', async ({ page }) => {
      await page.goto(detail);
      const list = page.getByRole('list').filter({ hasText: 'All-purpose flour' });
      const row = list.getByRole('listitem').filter({ hasText: 'All-purpose flour' });
      await expect(row.getByText('500 g')).toBeVisible();
      const amountBox = await row.getByText('500 g').boundingBox();
      const nameBox = await row.getByText('All-purpose flour').boundingBox();
      expect(amountBox).not.toBeNull();
      expect(nameBox).not.toBeNull();
      expect(amountBox!.x + amountBox!.width).toBeLessThanOrEqual(nameBox!.x);
      // No bordered card per ingredient.
      const border = await row.evaluate((el) => getComputedStyle(el).borderTopWidth);
      expect(border).toBe('0px');
    });

    for (const [name, viewport] of [
      ['320px', PHONE],
      ['1280px', DESKTOP],
    ] as const) {
      test(`Edit is the one visible action and the rest sits in More at ${name}`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await page.goto(detail);
        await expect(page.getByRole('link', { name: 'Edit recipe' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'History' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Archive recipe' })).toHaveCount(0);

        await page.getByRole('button', { name: 'More' }).click();
        await expect(page.getByRole('menuitem', { name: 'View history' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Translations' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Archive recipe' })).toBeVisible();
        await page.keyboard.press('Escape');

        const overflow = await page.evaluate(
          (width) => document.documentElement.scrollWidth > width + 1,
          viewport.width,
        );
        expect(overflow).toBe(false);
      });
    }

    for (const scheme of ['light', 'dark'] as const) {
      test(`has no serious axe violations in ${scheme} mode`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.setViewportSize(PHONE);
        await page.goto(`${detail}?added=1`);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expectNoSeriousAxeViolations(page);
      });
    }
  });

  test.describe('as viewer', () => {
    test('has no actions and no photo prompt, even with ?added=1', async ({ page, baseURL }) => {
      await loginAs(page, TEST_USERS.viewerA, baseURL);
      await page.goto(`${detail}?added=1`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Edit recipe' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Archive recipe' })).toHaveCount(0);
      await expect(familyMain(page).getByText('Add photos of this dish')).toHaveCount(0);
    });
  });
});
