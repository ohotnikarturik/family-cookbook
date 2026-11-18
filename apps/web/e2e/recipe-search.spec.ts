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

  test('one search box, a Search button and a collapsed Filters panel', async ({ page }) => {
    await page.goto(recipes);
    await expect(page.getByRole('searchbox', { name: 'Search', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeVisible();
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
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page).toHaveURL(/query=yeast/);
    await expect(page.getByRole('link', { name: "Grandma's cardamom buns" })).toBeVisible();
    await expect(page.getByText('1 recipe', { exact: true }).locator('visible=true')).toBeVisible();
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

  test('filters picked from the panel stay when searching', async ({ page }) => {
    await page.goto(recipes);
    await page.getByRole('button', { name: 'Filters' }).click();
    await page.getByLabel('Category', { exact: true }).selectOption('Baking');
    await page.getByLabel('Recipe language').selectOption('en');
    await page.getByRole('searchbox', { name: 'Search', exact: true }).fill('buns');
    await page.getByRole('button', { name: 'Search', exact: true }).first().click();
    await expect(page).toHaveURL(/category=Baking/);
    await expect(page).toHaveURL(/language=en/);
    await expect(page).toHaveURL(/query=buns/);
    await expect(page.getByRole('link', { name: "Grandma's cardamom buns" })).toBeVisible();
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
      await page.goto(`${recipes}?category=Baking`);
      await page.getByRole('button', { name: 'Filters' }).click();
      await expectNoSeriousAxeViolations(page);
    });
  }
});
