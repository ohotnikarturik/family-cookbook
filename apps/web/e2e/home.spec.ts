import { expect, test, type Page } from '@playwright/test';

import { expectNoSeriousAxeViolations } from './fixtures/axe';
import { loginAs } from './fixtures/auth';
import { FAMILY_A_ID, FAMILY_C_ID, TEST_USERS } from './fixtures/constants';
import { isLocalE2eStackReady } from './fixtures/env';

const familyA = `/en/f/${FAMILY_A_ID}`;
const familyC = `/en/f/${FAMILY_C_ID}`;
const PHONE = { width: 360, height: 740 };
const NARROW = { width: 320, height: 640 };
const DESKTOP = { width: 1280, height: 900 };

function main(page: Page) {
  return page.locator('#family-main');
}

async function expectNoSidewaysScroll(page: Page, width: number) {
  const overflow = await page.evaluate(
    (limit) => document.documentElement.scrollWidth > limit + 1,
    width,
  );
  expect(overflow).toBe(false);
}

test.describe('Home', () => {
  test.beforeAll(async () => {
    if (!(await isLocalE2eStackReady())) {
      test.skip();
    }
  });

  test.describe('with recipes, as owner', () => {
    test.beforeEach(async ({ page, baseURL }) => {
      await loginAs(page, TEST_USERS.ownerA, baseURL);
    });

    test('greets the family by name and offers Add recipe', async ({ page }) => {
      await page.setViewportSize(PHONE);
      await page.goto(familyA);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Andersen Test Kitchen');
      await expect(main(page).getByRole('link', { name: 'Add recipe' })).toHaveAttribute(
        'href',
        `${familyA}/recipes/new`,
      );
      await expect(main(page).locator('article').first()).toBeVisible();
      await expect(main(page).getByRole('link', { name: 'See all recipes' })).toBeVisible();
      await expect(main(page).getByRole('heading', { name: 'Your cookbook is empty' })).toHaveCount(
        0,
      );
    });

    test('typing searches in place: no button, focus kept, address updated', async ({ page }) => {
      await page.goto(familyA);
      const box = page.getByRole('searchbox', { name: 'Search recipes' });
      await expect(main(page).getByRole('button', { name: 'Search' })).toHaveCount(0);
      await expect(main(page).getByRole('heading', { name: 'Recently updated' })).toBeVisible();

      await box.pressSequentially('salmon');
      await expect(page).toHaveURL(new RegExp(`${familyA}\\?query=salmon$`));
      await expect(main(page).getByRole('heading', { name: 'Search results' })).toBeVisible();
      await expect(main(page).getByRole('heading', { name: 'Recently updated' })).toHaveCount(0);
      await expect(
        main(page).getByRole('heading', { name: 'Weeknight salmon soup' }),
      ).toBeVisible();
      await expect(main(page).getByText('1 recipe', { exact: true })).toBeVisible();
      await expect(box).toBeFocused();
      await expect(box).toHaveValue('salmon');
      // Everything fits on Home: no "see all" link.
      await expect(main(page).getByRole('link', { name: /^See all \d+ results$/ })).toHaveCount(0);

      // Emptying the box brings the recent recipes back.
      await box.fill('');
      await expect(page).toHaveURL(new RegExp(`${familyA}$`));
      await expect(main(page).getByRole('heading', { name: 'Recently updated' })).toBeVisible();
      await expect(box).toBeFocused();
    });

    test('one letter waits for Enter; many matches link to Recipes', async ({ page }) => {
      await page.goto(familyA);
      const box = page.getByRole('searchbox', { name: 'Search recipes' });
      await box.pressSequentially('e');
      // Longer than the 300 ms pause: still Home with recent recipes.
      await page.waitForTimeout(700);
      await expect(page).toHaveURL(new RegExp(`${familyA}$`));
      await box.press('Enter');
      await expect(page).toHaveURL(new RegExp(`${familyA}\\?query=e$`));
      const more = main(page).getByRole('link', { name: /^See all \d+ results$/ });
      await expect(more).toBeVisible();
      await more.click();
      await expect(page).toHaveURL(/\/recipes\?query=e$/);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Recipes');
    });

    test('no match shows a calm message and a way to all recipes', async ({ page }) => {
      await page.goto(familyA);
      await page.getByRole('searchbox', { name: 'Search recipes' }).pressSequentially('zzqx');
      await expect(main(page).getByRole('heading', { name: 'No matching recipes' })).toBeVisible();
      await main(page).getByRole('link', { name: 'Browse all recipes' }).click();
      await expect(page).toHaveURL(new RegExp(`${familyA}/recipes$`));
    });

    test('the box follows the address when Back returns to Home', async ({ page }) => {
      await page.goto(`${familyA}?query=salmon`);
      const box = page.getByRole('searchbox', { name: 'Search recipes' });
      await expect(box).toHaveValue('salmon');
      await expect(
        main(page).getByRole('heading', { name: 'Weeknight salmon soup' }),
      ).toBeVisible();
      await main(page).getByRole('link', { name: 'Soup', exact: true }).click();
      await expect(page).toHaveURL(/\/recipes\?category=Soup$/);
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`${familyA}\\?query=salmon$`));
      await expect(page.getByRole('searchbox', { name: 'Search recipes' })).toHaveValue('salmon');
    });

    test('a category chip opens the filtered list', async ({ page }) => {
      await page.goto(familyA);
      const chips = main(page).getByRole('navigation', { name: 'Recipe categories' });
      await expect(chips.getByRole('link', { name: 'Any category' })).toHaveCount(0);
      await chips.getByRole('link', { name: 'Soup', exact: true }).click();
      await expect(page).toHaveURL(/\/recipes\?category=Soup$/);
      await expect(
        main(page).getByRole('heading', { name: 'Weeknight salmon soup' }),
      ).toBeVisible();
    });

    test('has no sideways scroll at 320px, also with results', async ({ page }) => {
      await page.setViewportSize(NARROW);
      await page.goto(familyA);
      await expect(main(page).locator('article').first()).toBeVisible();
      await expectNoSidewaysScroll(page, NARROW.width);
      await page.goto(`${familyA}?query=e`);
      await expect(main(page).getByRole('heading', { name: 'Search results' })).toBeVisible();
      await expectNoSidewaysScroll(page, NARROW.width);
    });
  });

  test('with recipes, a viewer can search but not add', async ({ page, baseURL }) => {
    await loginAs(page, TEST_USERS.viewerA, baseURL);
    await page.goto(familyA);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Andersen Test Kitchen');
    await expect(main(page).getByRole('link', { name: 'Add recipe' })).toHaveCount(0);
    await expect(main(page).getByRole('link', { name: 'See all recipes' })).toBeVisible();
    await expect(main(page).locator('article').first()).toBeVisible();
    await page.getByRole('searchbox', { name: 'Search recipes' }).pressSequentially('salmon');
    await expect(main(page).getByRole('heading', { name: 'Weeknight salmon soup' })).toBeVisible();
  });

  test('empty cookbook: the owner gets three numbered steps', async ({ page, baseURL }) => {
    await loginAs(page, TEST_USERS.ownerC, baseURL);
    await page.setViewportSize(PHONE);
    await page.goto(familyC);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cole Empty Kitchen');
    const steps = main(page).getByRole('region', { name: 'Your cookbook is empty' });
    await expect(steps.getByRole('listitem')).toHaveCount(3);
    await expect(steps.getByRole('heading', { level: 3 })).toHaveText([
      'Add your first recipe',
      'Add a photo',
      'Invite your family',
    ]);
    await expect(steps.getByRole('link')).toHaveCount(2);
    await expect(steps.getByRole('link', { name: 'Invite family' })).toHaveAttribute(
      'href',
      `${familyC}/settings/invitations`,
    );
    // No search or recent list when there is nothing to find.
    await expect(page.getByRole('searchbox')).toHaveCount(0);
    await expect(main(page).locator('article')).toHaveCount(0);

    const addRecipe = steps.getByRole('link', { name: 'Add recipe' });
    await expect(addRecipe).toHaveAttribute('href', `${familyC}/recipes/new`);
    await addRecipe.click();
    // A cold dev server compiles the editor on first visit; give it longer than the default.
    await expect(page).toHaveURL(`${familyC}/recipes/new`, { timeout: 20_000 });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Add a recipe');
  });

  test('empty cookbook: a viewer gets a calm message and no buttons', async ({ page, baseURL }) => {
    await loginAs(page, TEST_USERS.viewerC, baseURL);
    await page.goto(familyC);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cole Empty Kitchen');
    await expect(main(page).getByText('No recipes yet. When someone in your family')).toBeVisible();
    await expect(main(page).getByRole('region', { name: 'Your cookbook is empty' })).toHaveCount(0);
    await expect(main(page).getByRole('link')).toHaveCount(0);
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`passes axe in ${scheme} theme, with and without recipes`, async ({
      page,
      context,
      baseURL,
    }) => {
      const host = new URL(baseURL ?? 'http://127.0.0.1:3003').hostname;
      for (const [email, path] of [
        [TEST_USERS.ownerA, familyA],
        [TEST_USERS.ownerC, familyC],
        [TEST_USERS.viewerC, familyC],
      ] as const) {
        await context.clearCookies();
        await loginAs(page, email, baseURL);
        await context.addCookies([{ name: 'fc-theme', value: scheme, domain: host, path: '/' }]);
        await page.emulateMedia({ colorScheme: scheme });
        for (const size of [NARROW, DESKTOP]) {
          await page.setViewportSize(size);
          await page.goto(path);
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
          await expectNoSeriousAxeViolations(page);
          if (size === NARROW) {
            await expectNoSidewaysScroll(page, NARROW.width);
          }
          if (path === familyA) {
            await page.goto(`${path}?query=salmon`);
            await expect(main(page).getByRole('heading', { name: 'Search results' })).toBeVisible();
            await expectNoSeriousAxeViolations(page);
          }
        }
      }
    });
  }
});
