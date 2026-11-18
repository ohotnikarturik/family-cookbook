import { expect, test, type Page } from '@playwright/test';

import { expectNoSeriousAxeViolations } from './fixtures/axe';
import { loginAs } from './fixtures/auth';
import { FAMILY_A_ID, RECIPE_ACTIVE_ID, TEST_USERS } from './fixtures/constants';
import { isLocalE2eStackReady } from './fixtures/env';
import { archiveRecipeFromDetail } from './fixtures/recipe-lifecycle';

const newRecipe = `/en/f/${FAMILY_A_ID}/recipes/new`;
const seededEdit = `/en/f/${FAMILY_A_ID}/recipes/${RECIPE_ACTIVE_ID}/edit`;
const PHONE = { width: 360, height: 800 };
const NARROW = { width: 320, height: 800 };

function ingredient(page: Page, position: number) {
  return page.getByRole('group', { name: `Ingredient ${position}`, exact: true });
}

function step(page: Page, position: number) {
  return page.getByRole('group', { name: `Step ${position}`, exact: true });
}

async function sectionHeadings(page: Page): Promise<string[]> {
  return page.locator('#family-main').getByRole('heading', { level: 2 }).allTextContents();
}

async function hasSidewaysScroll(page: Page, width: number): Promise<boolean> {
  return page.evaluate((limit) => document.documentElement.scrollWidth > limit + 1, width);
}

test.describe('lighter recipe editor', () => {
  test.beforeAll(async () => {
    if (!(await isLocalE2eStackReady())) {
      test.skip();
    }
  });

  test.beforeEach(async ({ page, baseURL }) => {
    await loginAs(page, TEST_USERS.ownerA, baseURL);
    await page.setViewportSize(PHONE);
  });

  test.describe('create, then edit at 360px', () => {
    test.describe.configure({ mode: 'serial' });
    let detailPath = '';
    const title = `E2E editor pancakes ${Date.now()}`;

    test('creates a recipe with one amount field, bulk add, notes and reorder', async ({
      page,
    }) => {
      await page.goto(newRecipe);
      await expect(page.getByRole('heading', { name: 'Add a recipe', level: 1 })).toBeVisible();
      expect(await sectionHeadings(page)).toEqual(['Basics', 'Ingredients', 'Steps', 'Details']);
      await expect(page.locator('datalist option[value="Baking"]')).toHaveCount(1);
      await expect(page.locator('datalist option[value="cup"]')).toHaveCount(1);

      await page.getByRole('textbox', { name: 'Recipe title', exact: true }).fill(title);
      const first = ingredient(page, 1);
      await first.getByRole('textbox', { name: 'Amount', exact: true }).fill('1 1/2');
      await first.getByLabel('Unit', { exact: true }).fill('cup');
      await page.getByRole('textbox', { name: 'Step 1', exact: true }).fill('Whisk everything.');

      // A row with an amount but no name is kept on the form with an error.
      await page.getByRole('button', { name: 'Save recipe' }).click();
      await expect(first.getByText('Check this ingredient name.')).toBeVisible({
        timeout: 15_000,
      });
      await expect(first.getByRole('textbox', { name: 'Amount', exact: true })).toHaveValue(
        '1 1/2',
      );
      await expect(page.getByRole('textbox', { name: 'Recipe title', exact: true })).toHaveValue(
        title,
      );
      await first.getByRole('textbox', { name: 'Ingredient', exact: true }).fill('flour');

      await first.getByRole('button', { name: 'Add note' }).click();
      const note = first.getByRole('textbox', { name: 'Note', exact: true });
      await expect(note).toBeFocused();
      await note.fill('sifted');

      const bulkToggle = page.getByRole('button', { name: 'Add several at once' });
      await bulkToggle.click();
      await expect(bulkToggle).toHaveAttribute('aria-expanded', 'true');
      const bulkText = page.getByRole('textbox', { name: 'Ingredients, one per line' });
      await expect(bulkText).toBeFocused();
      await bulkText.fill('2 eggs\n\n200 g butter');
      await page.getByRole('button', { name: 'Add to list' }).click();
      await expect(
        page.getByRole('status').filter({ hasText: '2 ingredients added.' }),
      ).toBeAttached();
      await expect(
        ingredient(page, 2).getByRole('textbox', { name: 'Ingredient', exact: true }),
      ).toHaveValue('eggs');
      await expect(ingredient(page, 3).getByLabel('Unit', { exact: true })).toHaveValue('g');

      await page.getByRole('button', { name: 'Add ingredient' }).click();
      const salt = ingredient(page, 4);
      await expect(salt.getByRole('textbox', { name: 'Amount', exact: true })).toBeFocused();
      await salt.getByRole('textbox', { name: 'Amount', exact: true }).fill('to taste');
      await salt.getByRole('textbox', { name: 'Ingredient', exact: true }).fill('salt');

      // Butter moves above the eggs; focus stays on the arrow of the moved row.
      await page.getByRole('button', { name: 'Move up, Ingredient 3' }).click();
      await expect(
        ingredient(page, 2).getByRole('textbox', { name: 'Ingredient', exact: true }),
      ).toHaveValue('butter');
      await expect(page.getByRole('button', { name: 'Move up, Ingredient 2' })).toBeFocused();

      const options = step(page, 1).getByRole('button', { name: 'More options' });
      await expect(options).toHaveAttribute('aria-expanded', 'false');
      await expect(page.getByRole('textbox', { name: 'Step time (minutes)' })).toBeHidden();
      await options.click();
      await expect(options).toHaveAttribute('aria-expanded', 'true');
      await page.getByRole('textbox', { name: 'Step time (minutes)' }).fill('10');

      await page.getByRole('button', { name: 'Save recipe' }).click();
      await expect(page).toHaveURL(
        new RegExp(`/en/f/${FAMILY_A_ID}/recipes/[0-9a-f-]+\\?added=1$`),
        {
          timeout: 30_000,
        },
      );
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      const article = page.getByRole('article');
      await expect(article.getByText('1.5 cup', { exact: true })).toBeVisible();
      await expect(article.getByText('200 g', { exact: true })).toBeVisible();
      await expect(article.getByText('to taste', { exact: true })).toBeVisible();
      detailPath = new URL(page.url()).pathname;
    });

    test('loads stored amounts back into the single field and saves an edit', async ({ page }) => {
      test.skip(detailPath === '', 'the create test did not finish');
      await page.goto(`${detailPath}/edit`);
      await expect(page.getByRole('heading', { name: 'Edit recipe', level: 1 })).toBeVisible();
      expect(await sectionHeadings(page)).toEqual([
        'Basics',
        'Ingredients',
        'Steps',
        'Details',
        'Add photos or sources',
      ]);

      const amounts = page
        .locator('#family-main')
        .getByRole('textbox', { name: 'Amount', exact: true });
      await expect(amounts).toHaveCount(4);
      expect(
        await amounts.evaluateAll((inputs) =>
          inputs.map((input) => (input as HTMLInputElement).value),
        ),
      ).toEqual(['1.5', '200', '2', 'to taste']);
      await expect(
        ingredient(page, 1).getByRole('textbox', { name: 'Note', exact: true }),
      ).toHaveValue('sifted');
      await expect(step(page, 1).getByRole('button', { name: 'More options' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      await expect(page.getByRole('textbox', { name: 'Step time (minutes)' })).toHaveValue('10');

      await ingredient(page, 1).getByRole('textbox', { name: 'Amount', exact: true }).fill('2');
      await page.getByRole('button', { name: 'Save recipe' }).click();
      await expect(page).toHaveURL(new RegExp(`${detailPath}$`), { timeout: 30_000 });
      await expect(page.getByRole('article').getByText('2 cup', { exact: true })).toBeVisible();

      await archiveRecipeFromDetail(page);
    });
  });

  for (const [name, path] of [
    ['new', newRecipe],
    ['edit', seededEdit],
  ] as const) {
    test(`${name} page does not scroll sideways at 320px`, async ({ page }) => {
      await page.setViewportSize(NARROW);
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.getByRole('button', { name: 'Add several at once' }).click();
      await step(page, 1).getByRole('button', { name: 'More options' }).click();
      expect(await hasSidewaysScroll(page, NARROW.width)).toBe(false);
    });

    for (const scheme of ['light', 'dark'] as const) {
      test(`${name} page has no serious axe violations in ${scheme} mode`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.setViewportSize(NARROW);
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await page.getByRole('button', { name: 'Add several at once' }).click();
        await expectNoSeriousAxeViolations(page);
      });
    }
  }
});
