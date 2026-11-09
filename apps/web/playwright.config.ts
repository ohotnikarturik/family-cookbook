import { defineConfig, devices } from '@playwright/test';

import { hydrateWebEnvFromLocalFile } from './e2e/fixtures/env';

hydrateWebEnvFromLocalFile();

const port = process.env.CI ? 3099 : 3003;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      grepInvert: /narrow viewport/,
    },
    {
      name: 'mobile-chrome',
      grep: /narrow viewport/,
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: process.env.CI
    ? {
        command: `pnpm exec next build && pnpm exec next start -p ${port}`,
        url: `${baseURL}/en/auth/sign-in`,
        timeout: 180_000,
        reuseExistingServer: false,
      }
    : {
        command: `pnpm exec next dev -p ${port}`,
        url: `${baseURL}/en/auth/sign-in`,
        timeout: 120_000,
        reuseExistingServer: true,
      },
});
