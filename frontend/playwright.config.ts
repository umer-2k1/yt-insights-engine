import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: '__tests__',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: process.env.CI !== undefined,
  retries: process.env.CI === undefined ? 0 : 2,
  workers: process.env.CI === undefined ? undefined : 1,
  reporter: process.env.CI === undefined ? 'html' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    actionTimeout: 0,
    trace: 'on-first-retry'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  outputDir: '__tests_results__',

  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: process.env.CI === undefined
  }
});
