import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';

/** Fresh browser context per test = cleared cookies. Banner is handled manually here (consent: 'none'). */
test.describe('Cookie banner & consent', () => {
  test.use({ consent: 'none' });

  const ANALYTICS = /^(_ga|_gid|_gat|_hj|_fbp|_clck|_clsk)/;

  test(qase(25181, 'Cookie banner appears on first visit @critical'), async ({ page, cookieBanner }) => {
    await page.goto('/');
    await expect(cookieBanner.banner).toBeVisible();
    await expect(cookieBanner.acceptButton).toBeVisible();
    await expect(cookieBanner.declineButton).toBeVisible();
    await expect(cookieBanner.preferencesButton).toBeVisible();
  });

  test(qase(25182, 'Cookie banner — accept all vs decline: consent stored correctly @critical'), async ({ page, context, cookieBanner }) => {
    await test.step('Accept', async () => {
      await page.goto('/');
      await cookieBanner.acceptButton.click();
      await expect(cookieBanner.banner).toBeHidden();
      await expect.poll(() => cookieBanner.consentValue()).not.toBeNull();
      const v = (await cookieBanner.consentValue())!;
      expect(Object.values(v).every(Boolean), `consent after Accept: ${JSON.stringify(v)}`).toBe(true);
      await page.reload();
      await expect(cookieBanner.banner).toBeHidden();
      const tab2 = await context.newPage();
      await tab2.goto('/');
      await expect(tab2.locator('[class*="cookieBanner_cookie_banner_box"]')).toBeHidden();
      await tab2.close();
    });
    await test.step('Decline (cleared cookies)', async () => {
      await context.clearCookies();
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
      await page.reload();
      await expect(cookieBanner.banner).toBeVisible();
      await cookieBanner.declineButton.click();
      await expect(cookieBanner.banner).toBeHidden();
      const v = (await cookieBanner.consentValue())!;
      expect(Object.values(v).some(Boolean), `consent after Decline: ${JSON.stringify(v)}`).toBe(false);
      await page.reload();
      await page.waitForLoadState('networkidle').catch(() => undefined);
      expect((await cookieBanner.cookieNames()).filter((n) => ANALYTICS.test(n)), 'analytics cookies after Decline').toEqual([]);
      await expect(cookieBanner.banner).toBeHidden();
    });
  });

  test(qase(25183, "'Book a call' + Functional Cookies consent: mini-banner flow @critical"), async ({ page, header, modals }) => {
    await page.goto('/');
    await header.bookACall.click();
    await expect(modals.functionalCookiesPopup).toBeVisible();
    await expect(modals.calendlyIframe).toHaveCount(0);
    await modals.functionalCookiesCancel.click();
    await expect(modals.functionalCookiesPopup).toBeHidden();
    await header.bookACall.click();
    await expect(modals.functionalCookiesPopup).toBeVisible();
    await modals.functionalCookiesAccept.click();
    await expect(modals.functionalCookiesPopup).toBeHidden();
    await header.bookACall.click();
    await expect(modals.calendlyIframe).toBeVisible({ timeout: 20_000 });
    await test.step('consent persists across navigation', async () => {
      await page.goto('/work');
      await header.bookACall.click();
      await expect(modals.functionalCookiesPopup).toBeHidden();
      await expect(modals.calendlyIframe).toBeVisible({ timeout: 20_000 });
    });
  });

  test(qase(25184, 'Cookie banner — does not reappear after consent (reload + navigation)'), async ({ page, context, cookieBanner, header }) => {
    for (const choice of ['accept', 'decline'] as const) {
      await test.step(choice, async () => {
        await context.clearCookies();
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await (choice === 'accept' ? cookieBanner.acceptButton : cookieBanner.declineButton).click();
        await expect(cookieBanner.banner).toBeHidden();
        const saved = await cookieBanner.consentValue();
        await page.reload();
        await expect(cookieBanner.banner).toBeHidden();
        for (const nav of [header.work, header.shopify]) {
          await nav.click();
          await expect(cookieBanner.banner).toBeHidden();
        }
        await page.goto('/contact');
        await expect(cookieBanner.banner).toBeHidden();
        expect(await cookieBanner.consentValue()).toEqual(saved);
      });
    }
  });

  test(qase(25185, 'Cookie preferences modal — per-category toggles save and persist'), async ({ page, cookieBanner }) => {
    await page.goto('/cookie-policy');
    await page.getByRole('button', { name: 'cookie button' }).filter({ hasText: 'Open cookie preferences' }).click();
    await expect(cookieBanner.zarazModal).toBeVisible();
    const count = await cookieBanner.zarazCheckboxes.count();
    expect(count, 'cookie categories').toBeGreaterThanOrEqual(3);
    await test.step("'Strictly necessary' category is ON and locked", async () => {
      await expect.soft(page.locator('dialog.cf_modal').getByText(/Strictly necessary|Necessary/i), 'no locked "Strictly necessary" category in modal').toBeVisible();
    });
    // enable first two optional categories, keep the last one OFF
    await cookieBanner.zarazCheckboxes.nth(0).check();
    await cookieBanner.zarazCheckboxes.nth(1).check();
    await cookieBanner.zarazCheckboxes.nth(count - 1).uncheck();
    await cookieBanner.zarazSave.click();
    await expect(cookieBanner.zarazModal).toBeHidden();
    const v = (await cookieBanner.consentValue())!;
    expect(Object.values(v).filter(Boolean).length, JSON.stringify(v)).toBe(2);
    await page.reload();
    await page.getByRole('button', { name: 'cookie button' }).filter({ hasText: 'Open cookie preferences' }).click();
    await expect(cookieBanner.zarazCheckboxes.nth(0)).toBeChecked();
    await expect(cookieBanner.zarazCheckboxes.nth(1)).toBeChecked();
    await expect(cookieBanner.zarazCheckboxes.nth(count - 1)).not.toBeChecked();
  });
});
