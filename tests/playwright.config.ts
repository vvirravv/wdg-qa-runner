import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

/**
 * devit.group E2E suite (Qase project WDG).
 *
 * Projects:
 *  - chromium  : main run, everything except @visual (Desktop Chrome 1440x900)
 *  - firefox / webkit : only @cross-browser smoke (Qase "Cross-browser" cases)
 *  - visual    : @visual screenshot baselines (Design Compliance, partial)
 *
 * Qase: set QASE_MODE=testops + QASE_TESTOPS_API_TOKEN in .env (see .env.example).
 */
const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } };

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['playwright-qase-reporter', {
      mode: process.env.QASE_MODE ?? 'off',
      testops: {
        project: process.env.QASE_TESTOPS_PROJECT ?? 'WDG',
        uploadAttachments: true,
        run: { complete: true },
      },
    }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://devit.group',
    locale: 'en-US',
    timezoneId: 'Europe/Kyiv',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: desktop, grepInvert: /@visual/ },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } }, grep: /@cross-browser/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } }, grep: /@cross-browser/ },
    { name: 'visual', use: desktop, grep: /@visual/ },
  ],
});
