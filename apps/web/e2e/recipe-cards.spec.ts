import { expect, test, type Page } from '@playwright/test';

import { expectNoSeriousAxeViolations } from './fixtures/axe';
import { loginAs } from './fixtures/auth';
import { FAMILY_A_ID, TEST_USERS } from './fixtures/constants';
import { isLocalE2eStackReady } from './fixtures/env';

const family = `/en/f/${FAMILY_A_ID}`;
const PHONE = { width: 360, height: 740 };
const NARROW = { width: 320, height: 640 };

async function cardBoxes(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('#family-main article'))
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, height: rect.height };
      }),
  );
}

test.describe('recipe cards', () => {
  test.beforeAll(async () => {
    if (!(await isLocalE2eStackReady())) {
      test.skip();
    }
  });

  test.beforeEach(async ({ page, baseURL }) => {
    await loginAs(page, TEST_USERS.ownerA, baseURL);
  });

  test('Recipes cards are compact rows: four of them fit in about half a phone screen', async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await page.goto(`${family}/recipes`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('#family-main article').first()).toBeVisible();
    const boxes = await cardBoxes(page);
    expect(boxes.length).toBeGreaterThanOrEqual(4);
    // The space above the list (search form) belongs to W38.14; measure the cards themselves.
    const fourth = boxes[3];
    const first = boxes[0];
    expect(fourth && first ? fourth.bottom - first.top : Infinity).toBeLessThanOrEqual(520);
    for (const box of boxes.slice(0, 4)) {
      expect(box.height).toBeLessThan(140);
    }
  });

  test('cards never show empty or zero meta', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto(`${family}/recipes`);
    await expect(page.locator('#family-main article').first()).toBeVisible();
    const text = await page.locator('#family-main ul[aria-label="Recipe results"]').innerText();
    expect(text).not.toMatch(/\b0 min\b/);
    expect(text).not.toMatch(/\b0 servings\b/);
    expect(text).not.toMatch(/Uncategorized/);
    // "Updated" shows a date or a relative phrase, never a clock time.
    expect(text).not.toMatch(/Updated [^\n]*\d{1,2}:\d{2}/);
  });

  test('on a wide screen every card has the same picture area, with or without a photo', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${family}/recipes`);
    await expect(page.locator('#family-main article').first()).toBeVisible();
    const covers = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#family-main article a > :first-child')).map(
        (element) => {
          const rect = element.getBoundingClientRect();
          return { width: Math.round(rect.width), height: Math.round(rect.height) };
        },
      ),
    );
    expect(covers.length).toBeGreaterThan(3);
    const heights = covers.map((cover) => cover.height);
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
  });

  test('Home shows at most six recent recipes', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto(family);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('#family-main article').first()).toBeVisible();
    const count = await page.locator('#family-main article').count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(6);
  });

  for (const route of [
    { name: 'Home', path: family },
    { name: 'Recipes', path: `${family}/recipes` },
  ]) {
    test(`${route.name} has no sideways scroll at 320px`, async ({ page }) => {
      await page.setViewportSize(NARROW);
      await page.goto(route.path);
      await expect(page.locator('#family-main article').first()).toBeVisible();
      const overflow = await page.evaluate(
        (width) => document.documentElement.scrollWidth > width + 1,
        NARROW.width,
      );
      expect(overflow).toBe(false);
    });
  }

  for (const scheme of ['light', 'dark'] as const) {
    test(`recipe card lists pass axe in ${scheme} theme`, async ({ page, context, baseURL }) => {
      const host = new URL(baseURL ?? 'http://127.0.0.1:3003').hostname;
      await context.addCookies([{ name: 'fc-theme', value: scheme, domain: host, path: '/' }]);
      await page.emulateMedia({ colorScheme: scheme });
      for (const size of [NARROW, { width: 1280, height: 900 }]) {
        await page.setViewportSize(size);
        for (const path of [family, `${family}/recipes`]) {
          await page.goto(path);
          await expect(page.locator('#family-main article').first()).toBeVisible();
          await expectNoSeriousAxeViolations(page);
        }
      }
    });
  }
});
