import { expect, type Page } from '@playwright/test';

/**
 * Archive the recipe open on the current detail page (English UI; Archive lives in the "More" menu).
 * Journeys use it to leave seeded Family A data as they found it, so local manual testing
 * and the screenshot baseline do not fill up with test recipes.
 */
export async function archiveRecipeFromDetail(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('menuitem', { name: 'Archive recipe' }).click();
  const dialog = page.getByRole('dialog', { name: 'Archive this recipe?' });
  await dialog.getByRole('button', { name: 'Archive', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restore recipe' })).toBeVisible({
    timeout: 15_000,
  });
}
