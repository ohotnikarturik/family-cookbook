import { expect, test, type Page } from '@playwright/test';

import { expectNoSeriousAxeViolations } from './fixtures/axe';
import { loginAs } from './fixtures/auth';
import { TEST_USERS } from './fixtures/constants';
import { isLocalE2eStackReady } from './fixtures/env';

const DESKTOP = { width: 1280, height: 900 };
const NARROW = { width: 320, height: 640 };

/** Signed-in pages outside a family: they share the account shell. */
const ACCOUNT_ROUTES = [
  { name: 'account', path: '/en/account', title: 'Your account' },
  { name: 'families', path: '/en/families', title: 'Your families' },
] as const;

/** Pages in the auth shell that a signed-in owner can open without a redirect. */
const AUTH_SHELL_ROUTES = [
  { name: 'landing', path: '/en', title: 'Family Cookbook', signedIn: false },
  { name: 'sign-in', path: '/en/auth/sign-in', title: 'Sign in', signedIn: false },
  {
    name: 'invitation without token',
    path: '/en/invite/accept',
    title: 'Accept invitation',
    signedIn: true,
  },
] as const;

/** Hidden copies of earlier routes stay in the DOM (Next.js Activity), so count visible nodes only. */
async function visibleH1Texts(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('h1'))
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => element.textContent?.trim() ?? ''),
  );
}

async function expectSingleH1(page: Page, title: string): Promise<void> {
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect
    .poll(async () => visibleH1Texts(page), { message: 'visible h1 texts' })
    .toEqual([title]);
}

async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    (width) => document.documentElement.scrollWidth > width + 1,
    NARROW.width,
  );
  expect(overflow).toBe(false);
}

async function setScheme(
  page: Page,
  context: import('@playwright/test').BrowserContext,
  baseURL: string | undefined,
  scheme: 'light' | 'dark',
): Promise<void> {
  const host = new URL(baseURL ?? 'http://127.0.0.1:3003').hostname;
  await context.addCookies([{ name: 'fc-theme', value: scheme, domain: host, path: '/' }]);
  await page.emulateMedia({ colorScheme: scheme });
}

test.describe('account shell', () => {
  test.beforeAll(async () => {
    if (!(await isLocalE2eStackReady())) {
      test.skip();
    }
  });

  test.beforeEach(async ({ page, baseURL }) => {
    await loginAs(page, TEST_USERS.ownerA, baseURL);
  });

  for (const route of ACCOUNT_ROUTES) {
    test(`${route.name} has one h1, a header, and starts at the top`, async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await page.goto(route.path);
      await expectSingleH1(page, route.title);
      await expect(page.getByRole('link', { name: 'Family Cookbook' }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Account and preferences' })).toBeVisible();
      await expect(page.getByRole('main')).toHaveCount(1);
      const box = await page.getByRole('heading', { level: 1 }).first().boundingBox();
      expect(box?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(220);
    });

    test(`${route.name} has no sideways scroll at 320px`, async ({ page }) => {
      await page.setViewportSize(NARROW);
      await page.goto(route.path);
      await expectSingleH1(page, route.title);
      await expectNoSidewaysScroll(page);
    });
  }

  test('account page holds the profile, language, appearance and sign out', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/en/account');
    await expectSingleH1(page, 'Your account');
    await expect(page.getByRole('region', { name: 'Signed in as' })).toContainText(
      TEST_USERS.ownerA,
    );
    await expect(page.getByRole('textbox', { name: 'Display name' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'App language' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Appearance' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to home' })).toHaveCount(0);
  });

  test('the old preferences address redirects to the account page', async ({ page }) => {
    await page.goto('/en/account/preferences');
    await expect(page).toHaveURL(/\/en\/account$/);
    await expectSingleH1(page, 'Your account');
  });

  test('the account menu no longer repeats language and appearance as a page link', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/en/account');
    await page.getByRole('button', { name: 'Account and preferences' }).click();
    await expect(page.getByRole('menuitem', { name: 'Language and appearance' })).toHaveCount(0);
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`account pages pass axe in ${scheme} theme`, async ({ page, context, baseURL }) => {
      await setScheme(page, context, baseURL, scheme);
      await page.setViewportSize(NARROW);
      for (const route of ACCOUNT_ROUTES) {
        await page.goto(route.path);
        await expectSingleH1(page, route.title);
        await expectNoSeriousAxeViolations(page);
      }
    });
  }
});

test.describe('auth shell', () => {
  test.beforeAll(async () => {
    if (!(await isLocalE2eStackReady())) {
      test.skip();
    }
  });

  for (const route of AUTH_SHELL_ROUTES) {
    test.describe(route.name, () => {
      test.beforeEach(async ({ page, baseURL }) => {
        if (route.signedIn) {
          await loginAs(page, TEST_USERS.ownerA, baseURL);
        }
      });

      test('has one h1, a logo and the language and appearance row', async ({ page }) => {
        await page.setViewportSize(DESKTOP);
        await page.goto(route.path);
        await expectSingleH1(page, route.title);
        await expect(page.getByRole('link', { name: 'Family Cookbook' }).first()).toBeVisible();
        await expect(page.getByRole('main')).toHaveCount(1);
        await expect(
          page.getByRole('contentinfo', { name: 'Language and appearance' }),
        ).toBeVisible();
      });

      test('has no sideways scroll at 320px', async ({ page }) => {
        await page.setViewportSize(NARROW);
        await page.goto(route.path);
        await expectSingleH1(page, route.title);
        await expectNoSidewaysScroll(page);
      });

      for (const scheme of ['light', 'dark'] as const) {
        test(`passes axe in ${scheme} theme`, async ({ page, context, baseURL }) => {
          await setScheme(page, context, baseURL, scheme);
          await page.setViewportSize(NARROW);
          await page.goto(route.path);
          await expectSingleH1(page, route.title);
          await expectNoSeriousAxeViolations(page);
        });
      }
    });
  }
});
