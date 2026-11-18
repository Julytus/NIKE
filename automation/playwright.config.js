// @ts-check
import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

import { BASE_URL } from './utils/env.js';

const isCI = !!process.env.CI;
const slowMo = Number(process.env.E2E_SLOWMO ?? 0);

// Chỉ chạy project `api` (vd `pnpm test:api`) thì không cần bật frontend.
const onlyApi = process.argv.some((a) => a === '--project=api' || a === 'api') &&
  !process.argv.some((a) => /--project=(chromium|firefox|webkit|mobile-chrome|setup)/.test(a));

const uiProject = { dependencies: ['setup'], testIgnore: /tests[\\/]api[\\/]/ };

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  globalSetup: './global-setup.js',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['allure-playwright', { resultsDir: 'allure-results', detail: true, suiteTitle: true }],
  ],
  use: {
    baseURL: BASE_URL,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Xem luồng bằng mắt: E2E_SLOWMO=400 pnpm exec playwright test <spec> --headed --workers=1
    launchOptions: { slowMo },
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.js/, use: { ...devices['Desktop Chrome'] } },
    { name: 'api', testMatch: /tests[\\/]api[\\/].*\.spec\.js/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, ...uiProject },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, ...uiProject },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, ...uiProject },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] }, ...uiProject },
  ],
  webServer: onlyApi || process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'pnpm --dir ../frontend dev',
        url: BASE_URL,
        reuseExistingServer: !isCI,
        timeout: 120_000,
        stdout: 'ignore',
      },
});
