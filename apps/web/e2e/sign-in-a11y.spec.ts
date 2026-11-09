import { test, expect } from '@playwright/test';

import { expectNoSeriousAxeViolations } from './fixtures/axe';

test.describe('auth a11y smoke', () => {
  test('sign-in route has no serious axe violations', async ({ page }) => {
    await page.goto('/en/auth/sign-in', { waitUntil: 'networkidle' });
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible({ timeout: 15_000 });
    await expectNoSeriousAxeViolations(page);
  });
});
