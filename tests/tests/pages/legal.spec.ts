import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';

test.describe('Privacy Policy — Functional', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/privacy-policy'); });

  test(qase(25472, 'Privacy Policy — all required sections present'), async ({ page }) => {
    for (const s of ['Personal Data List', 'Purpose of Personal Data Collection', 'Information Exchange', 'Information Security', 'Your Data Protection Rights', 'Contact Information']) {
      const btn = page.getByRole('button', { name: 'toggle button' }).filter({ hasText: s });
      await expect.soft(btn, s).toBeVisible();
    }
    await page.getByRole('button', { name: 'toggle button' }).filter({ hasText: 'Your Data Protection Rights' }).click();
    await expect.soft(page.locator('main')).toContainText(/GDPR|General Data Protection/i);
  });

  test(qase(25473, 'Privacy Policy — hi@devit.group is a mailto link'), async ({ page }) => {
    await page.getByRole('button', { name: 'toggle button' }).filter({ hasText: 'Contact Information' }).click();
    await expect(page.locator('main a[href="mailto:hi@devit.group"]')).toHaveText('hi@devit.group');
  });

  test(qase(25474, "Privacy Policy — 'Updated' date label visible"), async ({ page }) => {
    await expect(page.locator('main').getByText(/Updated\s+[A-Z][a-z]{2,8}\.? \d{1,2}, \d{4}/)).toBeVisible();
  });

  test(qase(25475, 'Privacy Policy — cross-link to Cookie Policy works'), async ({ page }) => {
    await page.getByRole('button', { name: 'toggle button' }).filter({ hasText: /^Cookies$/ }).click();
    await page.locator('main a[href="/cookie-policy"]').click();
    await expect(page).toHaveURL(/\/cookie-policy$/);
  });
});

test.describe('Cookie Policy — Functional', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/cookie-policy'); });

  test(qase(25484, 'Cookie Policy — all 4 cookie category sections present'), async ({ page }) => {
    await page.getByRole('button', { name: 'toggle button' }).filter({ hasText: 'Types of Cookies' }).click();
    for (const c of ['Strictly Necessary', 'Analytics', 'Functional', 'Targeting']) {
      await expect.soft(page.locator('main').getByText(new RegExp(`${c} Cookies`, 'i')).first(), c).toBeVisible();
    }
  });

  test(qase(25485, 'Cookie Policy — cookie tables have all required columns'), async ({ page }) => {
    for (const t of await page.getByRole('button', { name: 'toggle button' }).all()) await t.click();
    const tables = page.locator('main table');
    expect(await tables.count(), 'no cookie tables').toBeGreaterThan(0);
    for (let i = 0; i < await tables.count(); i++) {
      const head = (await tables.nth(i).locator('th, thead td').allInnerTexts()).join('|');
      for (const col of ['Used by', 'Cookie Name', 'Description', 'Expiration', 'Type of Service']) expect.soft(head, `table ${i}: ${col}`).toContain(col);
      expect.soft(await tables.nth(i).locator('tbody tr').count(), `table ${i} rows`).toBeGreaterThan(0);
    }
  });

  test(qase(25486, "Cookie Policy — 'Open cookie preferences' opens preferences modal"), async ({ page, cookieBanner }) => {
    await page.getByRole('button', { name: 'cookie button' }).filter({ hasText: 'Open cookie preferences' }).click();
    await expect(cookieBanner.zarazModal).toBeVisible();
    expect(await cookieBanner.zarazCheckboxes.count()).toBeGreaterThanOrEqual(3);
    await expect.soft(cookieBanner.zarazModal.getByRole('heading').first(), 'modal title not in page language (EN)').toHaveText(/^Cookie (preferences|settings)/i);
    await page.keyboard.press('Escape');
    await expect(cookieBanner.zarazModal).toBeHidden();
  });

  test(qase(25487, "Cookie Policy — 'available here' guide link is valid"), async ({ page, request }) => {
    await page.getByRole('button', { name: 'toggle button' }).first().click();
    const link = page.locator('main a').filter({ hasText: /here/i }).first();
    const href = (await link.getAttribute('href'))!;
    expect(href).not.toBe('/cookie-policy');
    expect((await request.get(href)).status()).toBeLessThan(400);
  });

  test(qase(25488, "Cookie Policy — 'Click here to proceed' goes to Privacy Policy"), async ({ page }) => {
    await page.getByRole('button', { name: 'toggle button' }).filter({ hasText: 'Data Accessibility' }).click();
    await page.locator('main a[href^="/privacy-policy"]').first().click();
    await expect(page).toHaveURL(/\/privacy-policy/);
  });

  test(qase(25489, "Cookie Policy — 'Updated' date label visible"), async ({ page }) => {
    await expect(page.locator('main').getByText(/Updated\s+[A-Z][a-z]{2,8}\.? \d{1,2}, \d{4}/)).toBeVisible();
  });
});
