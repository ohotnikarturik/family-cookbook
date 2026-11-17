import fs from 'node:fs';
import path from 'node:path';

import { test, type Page } from '@playwright/test';

import { loginAs } from './fixtures/auth';
import {
  FAMILY_A_ID,
  RECIPE_ACTIVE_ID,
  RECIPE_WITH_PHOTO_ID,
  TEST_USERS,
} from './fixtures/constants';
import { isLocalE2eStackReady } from './fixtures/env';

/**
 * UI screenshot baseline (EPIC 3.8, docs/fixtures/ui-baseline/README.md).
 * Not part of CI or `pnpm test:e2e`: run with `pnpm --filter @family-cookbook/web test:screens`.
 *
 * Env:
 * - SCREENS_LABEL  folder name under apps/web/screenshots/ (default `current`), e.g. `before`.
 * - SCREENS_LOCALE UI locale in the URL (default `ru`; longest labels, Cyrillic).
 */

function safeSegment(value: string | undefined, fallback: string): string {
  return value && /^[a-z0-9_-]{1,40}$/i.test(value) ? value : fallback;
}

const LABEL = safeSegment(process.env['SCREENS_LABEL'], 'current');
const LOCALE = safeSegment(process.env['SCREENS_LOCALE'], 'ru');
const OUT_ROOT = path.join(process.cwd(), 'screenshots', LABEL);

type Route = Readonly<{ name: string; path: string }>;

const family = `/${LOCALE}/f/${FAMILY_A_ID}`;

const SIGNED_OUT_ROUTES: readonly Route[] = [
  { name: 'landing', path: `/${LOCALE}` },
  { name: 'signin', path: `/${LOCALE}/auth/sign-in` },
];

const SIGNED_IN_ROUTES: readonly Route[] = [
  { name: 'home', path: family },
  { name: 'recipes', path: `${family}/recipes` },
  { name: 'detail', path: `${family}/recipes/${RECIPE_ACTIVE_ID}` },
  { name: 'detail-photo', path: `${family}/recipes/${RECIPE_WITH_PHOTO_ID}` },
  { name: 'edit', path: `${family}/recipes/${RECIPE_ACTIVE_ID}/edit` },
  { name: 'new', path: `${family}/recipes/new` },
  { name: 'history', path: `${family}/recipes/${RECIPE_ACTIVE_ID}/history` },
  { name: 'translations', path: `${family}/recipes/${RECIPE_ACTIVE_ID}/translations` },
  { name: 'settings', path: `${family}/settings` },
  { name: 'members', path: `${family}/settings/members` },
  { name: 'invitations', path: `${family}/settings/invitations` },
  { name: 'families', path: `/${LOCALE}/families` },
  { name: 'account', path: `/${LOCALE}/account` },
];

const VIEWPORTS = {
  phone: { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false },
} as const;

const THEMES = ['light', 'dark'] as const;

const USERS = {
  owner: TEST_USERS.ownerA,
  viewer: TEST_USERS.viewerA,
} as const;

type PageSummary = Readonly<{
  name: string;
  requested: string;
  landed: string;
  h1: number;
  navCurrent: string[];
  overflowX: boolean;
}>;

async function settle(page: Page): Promise<void> {
  // Hide the Next.js dev-tools badge; it is not part of the product UI.
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.waitForTimeout(700);
}

async function measure(page: Page): Promise<Omit<PageSummary, 'name' | 'requested'>> {
  // Compare with the configured viewport, not window.innerWidth: with isMobile, Chrome widens
  // the visual viewport to fit overflowing content, which would hide sideways scrolling.
  const viewportWidth = page.viewportSize()?.width ?? 0;
  const metrics = await page.evaluate((width) => {
    return {
      h1: document.querySelectorAll('h1').length,
      navCurrent: Array.from(document.querySelectorAll('nav [aria-current="page"]'))
        .filter((element) => element.getClientRects().length > 0)
        .map((element) => element.textContent?.trim() ?? ''),
      overflowX: document.documentElement.scrollWidth > width + 1,
    };
  }, viewportWidth);
  return { landed: new URL(page.url()).pathname, ...metrics };
}

async function captureRoutes(page: Page, routes: readonly Route[], dir: string): Promise<void> {
  fs.mkdirSync(dir, { recursive: true });
  const summary: PageSummary[] = [];
  for (const route of routes) {
    await page.goto(route.path, { waitUntil: 'networkidle' });
    await settle(page);
    summary.push({ name: route.name, requested: route.path, ...(await measure(page)) });
    await page.screenshot({
      path: path.join(dir, `${route.name}.jpg`),
      fullPage: true,
      type: 'jpeg',
      quality: 60,
    });
  }
  fs.writeFileSync(path.join(dir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
}

async function captureAccountMenu(page: Page, dir: string): Promise<void> {
  await page.goto(`${family}/recipes`, { waitUntil: 'networkidle' });
  await settle(page);
  await page.locator('header [aria-haspopup="menu"]').first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(dir, 'account-menu.jpg'), type: 'jpeg', quality: 60 });
}

test.beforeAll(async () => {
  if (!(await isLocalE2eStackReady())) {
    test.skip();
  }
});

for (const [viewportName, device] of Object.entries(VIEWPORTS)) {
  for (const theme of THEMES) {
    test.describe(`${viewportName} ${theme}`, () => {
      test.use({ ...device, colorScheme: theme });

      test.beforeEach(async ({ context, baseURL }) => {
        const host = new URL(baseURL ?? 'http://127.0.0.1:3003').hostname;
        // Theme preference cookie read by the early theme script; `system` would also follow colorScheme.
        await context.addCookies([{ name: 'fc-theme', value: theme, domain: host, path: '/' }]);
      });

      test('signed out', async ({ page }) => {
        test.setTimeout(120_000);
        await captureRoutes(
          page,
          SIGNED_OUT_ROUTES,
          path.join(OUT_ROOT, `${viewportName}-${theme}-signed-out`),
        );
      });

      for (const [userName, email] of Object.entries(USERS)) {
        test(userName, async ({ page, baseURL }) => {
          test.setTimeout(600_000);
          await loginAs(page, email, baseURL);
          const dir = path.join(OUT_ROOT, `${viewportName}-${theme}-${userName}`);
          await captureRoutes(page, SIGNED_IN_ROUTES, dir);
          await captureAccountMenu(page, dir);
        });
      }
    });
  }
}
