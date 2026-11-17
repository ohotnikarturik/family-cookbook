import { expect, test, type Page } from '@playwright/test';

import { expectNoSeriousAxeViolations } from './fixtures/axe';
import { loginAs } from './fixtures/auth';
import { FAMILY_A_ID, RECIPE_ACTIVE_ID, TEST_USERS } from './fixtures/constants';
import { isLocalE2eStackReady } from './fixtures/env';

const family = `/en/f/${FAMILY_A_ID}`;
const recipe = `${family}/recipes/${RECIPE_ACTIVE_ID}`;

/** Every family-shell page: its single `h1`, and the back link (if any) that must sit above it. */
const ROUTES = [
  { name: 'home', path: family, title: 'Home' },
  { name: 'recipes', path: `${family}/recipes`, title: 'Recipes' },
  { name: 'recipe detail', path: recipe, title: /\S/ },
  { name: 'recipe new', path: `${family}/recipes/new`, title: 'Add a recipe' },
  { name: 'recipe edit', path: `${recipe}/edit`, title: /\S/, back: 'Back to recipe' },
  { name: 'recipe history', path: `${recipe}/history`, title: /\S/, back: 'Back to recipe' },
  { name: 'translations', path: `${recipe}/translations`, title: /\S/, back: 'Back to recipe' },
  { name: 'settings', path: `${family}/settings`, title: 'Family settings' },
  { name: 'members', path: `${family}/settings/members`, title: 'Family members' },
  { name: 'invitations', path: `${family}/settings/invitations`, title: 'Invite relatives' },
] as const;

const DESKTOP = { width: 1280, height: 900 };
const NARROW = { width: 320, height: 640 };

/** Hidden copies of earlier routes stay in the DOM (Next.js Activity), so count visible nodes only. */
async function visibleH1Texts(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('h1'))
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => element.textContent?.trim() ?? ''),
  );
}

test.describe('page headers', () => {
  test.beforeAll(async () => {
    if (!(await isLocalE2eStackReady())) {
      test.skip();
    }
  });

  test.beforeEach(async ({ page, baseURL }) => {
    await loginAs(page, TEST_USERS.ownerA, baseURL);
  });

  for (const route of ROUTES) {
    test(`${route.name} has exactly one h1 and a way to Recipes`, async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await page.goto(route.path);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await expect
        .poll(async () => (await visibleH1Texts(page)).length, { message: 'visible h1 count' })
        .toBe(1);
      const [title] = await visibleH1Texts(page);
      if (typeof route.title === 'string') {
        expect(title).toBe(route.title);
      } else {
        expect(title).toMatch(route.title);
      }
      await expect(
        page.getByRole('navigation', { name: 'Family navigation' }).getByRole('link', {
          name: 'Recipes',
        }),
      ).toBeVisible();
    });

    test(`${route.name} has no sideways scroll at 320px`, async ({ page }) => {
      await page.setViewportSize(NARROW);
      await page.goto(route.path);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      const overflow = await page.evaluate(
        (width) => document.documentElement.scrollWidth > width + 1,
        NARROW.width,
      );
      expect(overflow).toBe(false);
    });

    if ('back' in route) {
      test(`${route.name} puts the back link above the title`, async ({ page }) => {
        await page.setViewportSize(DESKTOP);
        await page.goto(route.path);
        const back = page.getByRole('link', { name: route.back }).first();
        const heading = page.getByRole('heading', { level: 1 }).first();
        await expect(heading).toBeVisible();
        const backBox = await back.boundingBox();
        const headingBox = await heading.boundingBox();
        expect(backBox).not.toBeNull();
        expect(headingBox).not.toBeNull();
        expect((backBox?.y ?? 0) + (backBox?.height ?? 0) <= (headingBox?.y ?? 0) + 1).toBe(true);
      });
    }
  }

  test('settings pages no longer end with a back-to-dashboard link', async ({ page }) => {
    for (const path of [
      `${family}/settings`,
      `${family}/settings/members`,
      `${family}/settings/invitations`,
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Back to dashboard' })).toHaveCount(0);
    }
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`header pages pass axe in ${scheme} theme`, async ({ page, context, baseURL }) => {
      const host = new URL(baseURL ?? 'http://127.0.0.1:3003').hostname;
      await context.addCookies([{ name: 'fc-theme', value: scheme, domain: host, path: '/' }]);
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize(NARROW);
      for (const route of ROUTES) {
        await page.goto(route.path);
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
        await expectNoSeriousAxeViolations(page);
      }
    });
  }
});
