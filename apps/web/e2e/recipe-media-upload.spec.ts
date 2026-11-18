import { expect, test, type Locator, type Page } from '@playwright/test';

import { expectNoSeriousAxeViolations } from './fixtures/axe';
import { loginAs } from './fixtures/auth';
import { FAMILY_A_ID, RECIPE_ACTIVE_ID, TEST_USERS } from './fixtures/constants';
import { isLocalE2eStackReady } from './fixtures/env';
import { archiveRecipeFromDetail } from './fixtures/recipe-lifecycle';

const newRecipe = `/en/f/${FAMILY_A_ID}/recipes/new`;
const seededEdit = `/en/f/${FAMILY_A_ID}/recipes/${RECIPE_ACTIVE_ID}/edit`;
const PHONE = { width: 360, height: 800 };
const NARROW = { width: 320, height: 800 };

/** A real 1×1 PNG, so the server's byte check passes and the preview can render. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const PDF_SMALL = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n', 'latin1');

async function pickFile(
  page: Page,
  button: Locator,
  file: { name: string; mimeType: string; buffer: Buffer },
): Promise<void> {
  const chooser = page.waitForEvent('filechooser');
  await button.click();
  await (await chooser).setFiles(file);
}

function uploadPanel(page: Page): Locator {
  return page.getByRole('region', { name: 'Add photos or sources' });
}

test.describe('one-step photo upload', () => {
  test.beforeAll(async () => {
    if (!(await isLocalE2eStackReady())) {
      test.skip();
    }
  });

  test.beforeEach(async ({ page, baseURL }) => {
    await loginAs(page, TEST_USERS.ownerA, baseURL);
    await page.setViewportSize(PHONE);
  });

  // A fresh recipe each run, archived at the end, so the 10-file limit is never reached.
  test('adds a photo, a PDF scan and a step photo as soon as they are chosen', async ({ page }) => {
    await page.goto(newRecipe);
    await page
      .getByRole('textbox', { name: 'Recipe title', exact: true })
      .fill(`E2E upload soup ${Date.now()}`);
    await page.getByRole('textbox', { name: 'Ingredient', exact: true }).first().fill('water');
    await page.getByRole('textbox', { name: 'Step 1', exact: true }).fill('Boil the water.');
    await page.getByRole('button', { name: 'Save recipe' }).click();
    await expect(page).toHaveURL(/\?added=1$/, { timeout: 30_000 });
    const detailPath = new URL(page.url()).pathname;

    // Archive even when an assertion fails, so a failed run cannot leave the recipe active.
    try {
      const panel = uploadPanel(page);
      await expect(panel.getByText('0 of 10 files attached')).toBeVisible();
      // No type select and no separate upload button; the camera button is for touch screens only.
      await expect(panel.getByRole('combobox')).toHaveCount(0);
      await expect(panel.getByRole('button', { name: 'Upload file' })).toHaveCount(0);
      await expect(panel.getByRole('button', { name: 'Take photo' })).toHaveCount(0);

      await pickFile(page, panel.getByRole('button', { name: 'Add photo' }), {
        name: 'dish.png',
        mimeType: 'image/png',
        buffer: PNG_1X1,
      });
      await expect(panel.getByRole('status').filter({ hasText: 'Photo added.' })).toBeVisible({
        timeout: 30_000,
      });
      await expect(panel.getByRole('img', { name: 'The photo you just added' })).toBeVisible({
        timeout: 15_000,
      });
      await expect(panel.getByText('1 of 10 files attached')).toBeVisible({ timeout: 15_000 });

      await pickFile(page, panel.getByRole('button', { name: 'Add scan or PDF' }), {
        name: 'grandma-card.pdf',
        mimeType: 'application/pdf',
        buffer: PDF_SMALL,
      });
      await expect(panel.getByRole('status').filter({ hasText: 'Scan added.' })).toBeVisible({
        timeout: 30_000,
      });
      await expect(panel.getByText('2 of 10 files attached')).toBeVisible({ timeout: 15_000 });
      // Stored as an original document: it is listed by name with a download link.
      await expect(page.getByText('grandma-card.pdf', { exact: true })).toBeVisible({
        timeout: 15_000,
      });

      // Too large: refused in the browser, nothing is uploaded and the count stays.
      await pickFile(page, panel.getByRole('button', { name: 'Add photo' }), {
        name: 'huge.png',
        mimeType: 'image/png',
        buffer: Buffer.concat([PNG_1X1, Buffer.alloc(16 * 1024 * 1024)]),
      });
      await expect(panel.getByRole('alert')).toHaveText(
        'This file is too large for the allowed limit.',
      );
      await expect(panel.getByText('2 of 10 files attached')).toBeVisible();

      await page.goto(`${detailPath}/edit`);
      const step = page.getByRole('group', { name: 'Step 1', exact: true });
      await step.getByRole('button', { name: 'More options' }).click();
      await pickFile(page, step.getByRole('button', { name: 'Add photo for step 1' }), {
        name: 'step.png',
        mimeType: 'image/png',
        buffer: PNG_1X1,
      });
      await expect(step.getByRole('img', { name: 'Photo for step 1' })).toBeVisible({
        timeout: 30_000,
      });
      await expect(step.getByRole('status').filter({ hasText: 'Step photo added.' })).toBeVisible();
      await expect(uploadPanel(page).getByText('3 of 10 files attached')).toBeVisible();
    } finally {
      await page.goto(detailPath);
      await archiveRecipeFromDetail(page);
    }
  });

  test('edit page does not scroll sideways at 320px', async ({ page }) => {
    await page.setViewportSize(NARROW);
    await page.goto(seededEdit);
    await expect(uploadPanel(page).getByRole('button', { name: 'Add photo' })).toBeVisible();
    expect(
      await page.evaluate(
        (limit) => document.documentElement.scrollWidth > limit + 1,
        NARROW.width,
      ),
    ).toBe(false);
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`edit page upload controls have no serious axe violations in ${scheme} mode`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize(NARROW);
      await page.goto(seededEdit);
      await expect(uploadPanel(page).getByRole('button', { name: 'Add photo' })).toBeVisible();
      await expectNoSeriousAxeViolations(page);
    });
  }
});

test.describe('one-step photo upload on a touch screen', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: PHONE });

  test.beforeAll(async () => {
    if (!(await isLocalE2eStackReady())) {
      test.skip();
    }
  });

  test('offers "Take photo" that opens the camera', async ({ page, baseURL }) => {
    await loginAs(page, TEST_USERS.ownerA, baseURL);
    await page.goto(seededEdit);
    const take = uploadPanel(page).getByRole('button', { name: 'Take photo' });
    await expect(take).toBeVisible();
    const chooser = page.waitForEvent('filechooser');
    await take.click();
    const input = (await chooser).element();
    await expect.poll(() => input.getAttribute('capture')).toBe('environment');
    // The normal picker stays available next to the camera.
    await expect(uploadPanel(page).getByRole('button', { name: 'Add photo' })).toBeVisible();
  });
});
