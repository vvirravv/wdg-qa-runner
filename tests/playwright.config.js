// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: 1,
  workers: 3,
  snapshotDir: './snapshots',
  snapshotPathTemplate: '{snapshotDir}/{arg}{ext}',

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['./reporters/summary.js'],
  ],

  use: {
    baseURL: 'https://devit.group',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.PW_VIDEO === 'on' ? 'on' : 'off',
    launchOptions: {
      slowMo: process.env.PW_SLOW_MO ? parseInt(process.env.PW_SLOW_MO) : 0,
    },
  },

  projects: [
    {
      name: 'desktop-chrome',
      testIgnore: ['**/visual/**'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'desktop-firefox',
      testIgnore: ['**/visual/**'],
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'visual',
      testDir: './visual',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
  ],
});
