import { expect, test, type Page } from '@playwright/test';

import { expectNoSeriousAxeViolations } from './fixtures/axe';
import { loginAs } from './fixtures/auth';
import { FAMILY_A_ID, RECIPE_ACTIVE_ID, TEST_USERS } from './fixtures/constants';
import { isLocalE2eStackReady } from './fixtures/env';

const family = `/en/f/${FAMILY_A_ID}`;

/** Every family-shell page, with the primary navigation item it must highlight. */
const ROUTES = [
  { name: 'home', path: family, current: 'Home' },
  { name: 'recipes', path: `${family}/recipes`, current: 'Recipes' },
  { name: 'recipe detail', path: `${family}/recipes/${RECIPE_ACTIVE_ID}`, current: 'Recipes' },
  { name: 'recipe edit', path: `${family}/recipes/${RECIPE_ACTIVE_ID}/edit`, current: 'Recipes' },
  { name: 'settings', path: `${family}/settings`, current: 'Family' },
  { name: 'members', path: `${family}/settings/members`, current: 'Family' },
  { name: 'invitations', path: `${family}/settings/invitations`, current: 'Family' },
] as const;

const DESKTOP = { width: 1280, height: 900 };
const PHONE = { width: 360, height: 740 };
const NARROW = { width: 320, height: 640 };

/** Hidden copies of earlier routes stay in the DOM (Next.js Activity), so count visible nodes only. */
async function visibleCurrentLabels(page: Page, navLabel: string): Promise<string[]> {
  return page.evaluate((label) => {
    const nav = Array.from(document.querySelectorAll('nav')).find(
      (element) => element.getAttribute('aria-label') === label && element.getClientRects().length,
    );
    return Array.from(nav?.querySelectorAll('[aria-current="page"]') ?? [])
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => element.textContent?.trim() ?? '');
  }, navLabel);
}

test.describe('shell navigation', () => {
  test.beforeAll(async () => {
    if (!(await isLocalE2eStackReady())) {
      test.skip();
    }
  });

  test.describe('owner', () => {
    test.beforeEach(async ({ page, baseURL }) => {
      await loginAs(page, TEST_USERS.ownerA, baseURL);
    });

    for (const route of ROUTES) {
      test(`desktop highlights ${route.current} on ${route.name}`, async ({ page }) => {
        await page.setViewportSize(DESKTOP);
        await page.goto(route.path);
        await expect(page.getByRole('link', { name: 'Home' }).first()).toBeVisible();
        await expect
          .poll(() => visibleCurrentLabels(page, 'Family navigation'))
          .toEqual([route.current]);
      });

      test(`phone highlights ${route.current} on ${route.name} without sideways scroll`, async ({
        page,
      }) => {
        await page.setViewportSize(NARROW);
        await page.goto(route.path);
        await expect
          .poll(() => visibleCurrentLabels(page, 'Quick navigation'))
          .toEqual([route.current]);
        const overflow = await page.evaluate(
          (width) => document.documentElement.scrollWidth > width + 1,
          NARROW.width,
        );
        expect(overflow).toBe(false);
      });
    }

    test('phone navigation lists Home, Recipes, Add recipe and Family', async ({ page }) => {
      await page.setViewportSize(PHONE);
      await page.goto(family);
      const nav = page.getByRole('navigation', { name: 'Quick navigation' });
      await expect(nav.getByRole('link')).toHaveText(['Home', 'Recipes', 'Add recipe', 'Family']);
    });

    test('logo links to Home', async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await page.goto(`${family}/recipes`);
      await page.getByRole('link', { name: 'Family Cookbook' }).first().click();
      await expect(page).toHaveURL(new RegExp(`/en/f/${FAMILY_A_ID}/?$`));
    });

    test('account menu opens with account first and stays inside the viewport', async ({
      page,
    }) => {
      await page.setViewportSize(PHONE);
      await page.goto(family);
      await page.getByRole('button', { name: 'Account and preferences' }).click();
      await expect(page.getByRole('menuitem').first()).toHaveText('Your account');
      const box = await page.getByRole('menu').boundingBox();
      expect(box).not.toBeNull();
      expect((box?.x ?? -1) >= 0).toBe(true);
      expect((box?.x ?? 0) + (box?.width ?? 0) <= PHONE.width).toBe(true);
    });

    test('account menu stays reachable on a short viewport', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 400 });
      await page.goto(family);
      await page.getByRole('button', { name: 'Account and preferences' }).click();
      const signOut = page.getByRole('button', { name: 'Sign out' });
      await signOut.scrollIntoViewIfNeeded();
      await expect(signOut).toBeInViewport();
      const box = await page.getByRole('menu').boundingBox();
      expect((box?.y ?? -1) >= 0).toBe(true);
      expect((box?.y ?? 0) + (box?.height ?? 0) <= 400).toBe(true);
    });

    for (const scheme of ['light', 'dark'] as const) {
      test(`active styles pass axe in ${scheme} theme`, async ({ page, context, baseURL }) => {
        const host = new URL(baseURL ?? 'http://127.0.0.1:3003').hostname;
        await context.addCookies([{ name: 'fc-theme', value: scheme, domain: host, path: '/' }]);
        await page.emulateMedia({ colorScheme: scheme });
        for (const path of [family, `${family}/settings/members`]) {
          for (const viewport of [DESKTOP, PHONE]) {
            await page.setViewportSize(viewport);
            await page.goto(path);
            await expect(page.locator('[aria-current="page"]:visible').first()).toBeVisible();
            await expectNoSeriousAxeViolations(page);
          }
        }
      });
    }
  });

  test('viewer does not get an Add recipe item', async ({ page, baseURL }) => {
    await loginAs(page, TEST_USERS.viewerA, baseURL);
    await page.setViewportSize(PHONE);
    await page.goto(family);
    const nav = page.getByRole('navigation', { name: 'Quick navigation' });
    await expect(nav.getByRole('link')).toHaveText(['Home', 'Recipes', 'Family']);
  });
});
