import type { Locator, Page } from '@playwright/test';

/**
 * The family page content area. Text queries must be scoped to it: on production builds React can
 * leave the server copy of a streamed Suspense boundary as an inert `<div hidden id="S:n">` at the end
 * of `<body>` when hydration wins the race against the reveal script. Users never see it (the client
 * renders its own copy), and role queries skip it, but `getByText` counts it and fails strict mode.
 */
export function familyMain(page: Page): Locator {
  return page.locator('#family-main');
}
