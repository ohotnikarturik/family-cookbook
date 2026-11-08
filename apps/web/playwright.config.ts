import { defineConfig, devices } from '@playwright/test';

const port = process.env.CI ? 3099 : 3003;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  ...(process.env.CI
    ? {
        webServer: {
          command: `pnpm exec next build && pnpm exec next start -p ${port}`,
          url: `${baseURL}/en/auth/sign-in`,
          timeout: 120_000,
        },
      }
    : {}),
});
