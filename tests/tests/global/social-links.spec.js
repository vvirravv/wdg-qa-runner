// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('[SOC] Social & contact links on /support', () => {

  test('[80456] Messenger link href is correct', async ({ page }) => {
    await page.goto('/support');
    await page.waitForLoadState('networkidle');
    const link = page.locator('a[href*="m.me"]').first()
      .or(page.getByRole('link', { name: /messenger/i }).first());
    if (await link.count() > 0) {
      const href = await link.getAttribute('href');
      expect(href).toContain('m.me');
      const target = await link.getAttribute('target');
      expect(target).toBe('_blank');
    }
  });

  test('[80457] Discord link opens DevIT community in new tab', async ({ page }) => {
    await page.goto('/support');
    await page.waitForLoadState('networkidle');
    const link = page.locator('a[href*="discord"]').first()
      .or(page.getByRole('link', { name: /discord/i }).first());
    if (await link.count() > 0) {
      const href = await link.getAttribute('href');
      expect(href).toContain('discord');
      const target = await link.getAttribute('target');
      expect(target).toBe('_blank');
    }
  });

  test('[80458] Telegram bot link opens in new tab', async ({ page }) => {
    await page.goto('/support');
    await page.waitForLoadState('networkidle');
    const link = page.locator('a[href*="t.me"]').first()
      .or(page.getByRole('link', { name: /telegram/i }).first());
    if (await link.count() > 0) {
      const href = await link.getAttribute('href');
      expect(href).toContain('t.me');
      const target = await link.getAttribute('target');
      expect(target).toBe('_blank');
    }
  });

  test('[80466] Support email link is valid mailto:', async ({ page }) => {
    await page.goto('/support');
    await page.waitForLoadState('networkidle');
    const emailLink = page.locator('a[href^="mailto:"]').first();
    if (await emailLink.count() > 0) {
      const href = await emailLink.getAttribute('href');
      expect(href).toMatch(/^mailto:.+@.+\..+/);
      expect(href).not.toContain('undefined');
    }
  });

});
