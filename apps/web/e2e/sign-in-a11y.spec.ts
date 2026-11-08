import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

test.describe('auth a11y smoke', () => {
  test('sign-in route has no serious axe violations', async ({ page }) => {
    await page.goto('/en/auth/sign-in', { waitUntil: 'networkidle' });
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible({ timeout: 15_000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const serious = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );

    expect(serious).toEqual([]);
  });
});
