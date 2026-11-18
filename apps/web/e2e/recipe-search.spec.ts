import { expect, test } from '@playwright/test';

import { expectNoSeriousAxeViolations } from './fixtures/axe';
import { loginAs } from './fixtures/auth';
import { FAMILY_A_ID, TEST_USERS } from './fixtures/constants';
import { isLocalE2eStackReady } from './fixtures/env';

const recipes = `/en/f/${FAMILY_A_ID}/recipes`;
const NARROW = { width: 320, height: 640 };

test.describe('search-first recipe browse', () => {
  test.beforeAll(async () => {
    if (!(await isLocalE2eStackReady())) {
      test.skip();
    }
  });

  test.beforeEach(async ({ page, baseURL }) => {
    await loginAs(page, TEST_USERS.ownerA, baseURL);
  });

  test('one search box, no Search button and a collapsed Filters panel', async ({ page }) => {
    await page.goto(recipes);
    await expect(page.getByRole('searchbox', { name: 'Search', exact: true })).toBeVisible();
    // Typing searches and filters apply on change, so there is nothing to confirm.
    await expect(page.getByRole('button', { name: 'Search', exact: true })).toHaveCount(0);
    const filters = page.getByRole('button', { name: 'Filters' });
    await expect(filters).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByLabel('Category', { exact: true })).toBeHidden();
    await filters.click();
    await expect(filters).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByLabel('Category', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Recipe language')).toBeVisible();
    await expect(page.getByLabel('Sort by')).toBeVisible();
  });

  test('finds a recipe by an ingredient name and shows the count', async ({ page }) => {
    await page.goto(recipes);
    await page.getByRole('searchbox', { name: 'Search', exact: true }).fill('yeast');
    await expect(page).toHaveURL(/query=yeast/);
    await expect(page.getByRole('link', { name: "Grandma's cardamom buns" })).toBeVisible();
    await expect(page.locator('p:not([role])', { hasText: /^1 recipe$/ })).toBeVisible();
    // The live region in the layout reads the new count out after the search.
    await expect(page.locator('p[role="status"]', { hasText: /^1 recipe/ })).toHaveCount(1);
    await expect(page.getByRole('link', { name: /Search: yeast/ })).toBeVisible();
  });

  test('a category chip browses in one tap and keeps the search text', async ({ page }) => {
    await page.goto(recipes);
    const chips = page.getByRole('navigation', { name: 'Browse by category' });
    await chips.getByRole('link', { name: 'Baking' }).click();
    await expect(page).toHaveURL(/category=Baking/);
    await expect(page.getByRole('link', { name: "Grandma's cardamom buns" })).toBeVisible();
    await expect(chips.getByRole('link', { name: 'Baking selected' })).toBeVisible();
    // aria-current belongs to the main navigation, not to filter chips.
    await expect(chips.locator('[aria-current]')).toHaveCount(0);
    await expect(chips.getByRole('link', { name: 'Any category' })).toBeVisible();
  });

  test('a filter applies as soon as it is chosen; the panel stays open', async ({ page }) => {
    await page.goto(recipes);
    const filters = page.getByRole('button', { name: 'Filters' });
    await filters.click();
    const category = page.getByLabel('Category', { exact: true });
    await category.focus();
    await category.selectOption('Baking');
    await expect(page).toHaveURL(/category=Baking/);
    await expect(page.getByRole('link', { name: 'Weeknight salmon soup' })).toHaveCount(0);
    await expect(filters).toHaveAttribute('aria-expanded', 'true');
    await expect(category).toBeFocused();
    await expect(category).toHaveValue('Baking');
  });

  test('filters picked from the panel stay when searching', async ({ page }) => {
    await page.goto(recipes);
    await page.getByRole('button', { name: 'Filters' }).click();
    await page.getByLabel('Category', { exact: true }).selectOption('Baking');
    await page.getByLabel('Recipe language').selectOption('en');
    await page.getByRole('searchbox', { name: 'Search', exact: true }).fill('buns');
    await expect(page).toHaveURL(/category=Baking/);
    await expect(page).toHaveURL(/language=en/);
    await expect(page).toHaveURL(/query=buns/);
    await expect(page.getByRole('link', { name: "Grandma's cardamom buns" })).toBeVisible();
  });

  test.describe('search as you type', () => {
    const box = (page: import('@playwright/test').Page) =>
      page.getByRole('searchbox', { name: 'Search', exact: true });

    test('typing finds a recipe without clicking Search, and keeps focus', async ({ page }) => {
      await page.goto(recipes);
      await box(page).click();
      await page.keyboard.type('yeast', { delay: 40 });
      await expect(page).toHaveURL(/query=yeast/);
      await expect(page.getByRole('link', { name: "Grandma's cardamom buns" })).toBeVisible();
      await expect(box(page)).toBeFocused();
      await expect(box(page)).toHaveValue('yeast');
    });

    test('one letter does nothing; clearing the box shows every recipe again', async ({ page }) => {
      await page.goto(recipes);
      await box(page).click();
      await page.keyboard.type('y');
      await page.waitForTimeout(700);
      await expect(page).toHaveURL(new RegExp(`${recipes}$`));

      await page.keyboard.type('east', { delay: 40 });
      await expect(page).toHaveURL(/query=yeast/);
      await box(page).fill('');
      await expect(page).toHaveURL(new RegExp(`${recipes}$`));
      await expect(box(page)).toBeFocused();
    });

    test('Enter searches straight away, even for one letter', async ({ page }) => {
      await page.goto(recipes);
      await box(page).click();
      await page.keyboard.type('u');
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/query=u/);
      await expect(box(page)).toBeFocused();
    });

    test('typing leaves one history entry, not one per letter', async ({ page }) => {
      const home = `/en/f/${FAMILY_A_ID}`;
      await page.goto(home);
      await page.goto(recipes);
      await box(page).click();
      await page.keyboard.type('cardamom', { delay: 30 });
      await expect(page).toHaveURL(/query=cardamom/);
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`${home}$`));
    });

    test('removing the search chip empties the box', async ({ page }) => {
      await page.goto(`${recipes}?query=yeast`);
      await expect(box(page)).toHaveValue('yeast');
      await page.getByRole('link', { name: /Search: yeast/ }).click();
      await expect(page).toHaveURL(new RegExp(`${recipes}$`));
      await expect(box(page)).toHaveValue('');
    });

    test('filters chosen in the panel are kept while typing', async ({ page }) => {
      await page.goto(`${recipes}?category=Baking`);
      await box(page).click();
      await page.keyboard.type('buns', { delay: 40 });
      await expect(page).toHaveURL(/category=Baking/);
      await expect(page).toHaveURL(/query=buns/);
    });

    test('the hint is shown, the count is announced politely, 320px has no overflow', async ({
      page,
    }) => {
      await page.setViewportSize(NARROW);
      await page.goto(recipes);
      await expect(
        page.getByText('Results update as you type. Type at least 2 letters.'),
      ).toBeVisible();
      await expect(box(page)).toHaveAccessibleDescription(/at least 2 letters/);
      await expect(page.locator('p[role="status"].sr-only')).toHaveCount(1);
      const overflow = await page.evaluate(
        (width) => document.documentElement.scrollWidth > width + 1,
        NARROW.width,
      );
      expect(overflow).toBe(false);
    });
  });

  test('an empty result offers Clear filters', async ({ page }) => {
    await page.goto(`${recipes}?query=zzzznotarecipe`);
    await expect(page.getByText('No matching recipes').locator('visible=true')).toBeVisible();
    await page.getByRole('link', { name: 'Clear filters' }).first().click();
    await expect(page).toHaveURL(new RegExp(`${recipes}$`));
    await expect(page.getByRole('link', { name: "Grandma's cardamom buns" })).toBeVisible();
  });

  test('another family’s recipes never show up in search', async ({ page }) => {
    await page.goto(`${recipes}?query=pancakes`);
    await expect(page.getByText('No matching recipes').locator('visible=true')).toBeVisible();
    await expect(page.getByRole('link', { name: "Contributor's pancakes" })).toHaveCount(0);
  });

  test('no sideways scroll at 320px, with the panel open', async ({ page }) => {
    await page.setViewportSize(NARROW);
    await page.goto(recipes);
    await page.getByRole('button', { name: 'Filters' }).click();
    const overflow = await page.evaluate(
      (width) => document.documentElement.scrollWidth > width + 1,
      NARROW.width,
    );
    expect(overflow).toBe(false);
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`has no serious axe violations in ${scheme} with the panel open`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize(NARROW);
      await page.goto(`${recipes}?category=Baking`);
      await page.getByRole('button', { name: 'Filters' }).click();
      await expectNoSeriousAxeViolations(page);
    });
  }
});
