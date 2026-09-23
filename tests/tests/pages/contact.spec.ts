import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';

const ROUTING_TITLE = /Got a project\?|Need help with an app\?/;

test.describe('Contact — routing modal', () => {
  test.use({ autoCloseRoutingModal: false });

  test(qase(25314, "Contact — routing modal appears on load, all actions work"), async ({ page }) => {
    await page.goto('/contact');
    const title = page.getByRole('heading', { name: ROUTING_TITLE });
    await expect(title).toBeVisible();
    await page.getByRole('link', { name: 'Go to Support', exact: true }).click();
    await expect(page).toHaveURL(/\/support$/);

    await page.goto('/contact');
    await expect(title).toBeVisible();
    await page.getByRole('button', { name: 'Stay here', exact: true }).click();
    await expect(title).toBeHidden();
    await expect(page).toHaveURL(/\/contact$/);

    await page.reload();
    await expect(title).toBeVisible();
    await page.getByRole('button', { name: 'close button' }).filter({ visible: true }).last().click();
    await expect(title).toBeHidden();
    await expect(page).toHaveURL(/\/contact$/);
  });
});

test.describe('Contact — Functional', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/contact'); });

  test(qase(25315, "Contact — 'Book a call' opens booking"), async ({ page, modals }) => {
    await page.locator('main').getByRole('button', { name: 'open book a call modal button' }).click();
    await expect(modals.functionalCookiesPopup.or(modals.calendlyIframe)).toBeVisible();
  });

  test.describe('cookies accepted', () => {
    test.use({ consent: 'accept' });
    test(qase(25317, "Contact — 'Request callback' button opens callback form"), async ({ page }) => {
      await page.getByRole('button', { name: 'request callback button' }).first().click();
      await expect(page.getByRole('textbox', { name: /phone/i }).or(page.locator('iframe:visible').last()).first()).toBeVisible({ timeout: 15_000 });
    });
    test(qase(25318, "Contact — 'Let's chat' opens live chat widget"), async ({ page, modals }) => {
      await page.getByRole('button', { name: 'open live chat button' }).click();
      await expect(modals.anyChatWidget).toBeVisible({ timeout: 15_000 });
    });
  });

  test(qase(25319, 'Contact — all office Google Maps links open in new tab'), async ({ page }) => {
    const maps = page.locator('section#locations a[href*="google.com/maps"], section#representatives a[href*="google.com/maps"]');
    expect(await maps.count()).toBeGreaterThanOrEqual(3);
    expect(await maps.evaluateAll((as) => as.filter((a) => a.getAttribute('target') !== '_blank').length)).toBe(0);
    for (const city of ['Kyiv', 'Toronto']) {
      await expect.soft(page.locator('section#locations, section#representatives').getByRole('heading', { name: new RegExp(city) }).first()).toBeVisible();
    }
    const popup = page.context().waitForEvent('page');
    await maps.first().click();
    await expect(await popup).toHaveURL(/google\.[a-z.]+\/maps|consent\.google/);
  });

  test(qase(25320, 'Contact — phone numbers display with flags and are tel: links'), async ({ page }) => {
    for (const [text, tel] of [['+1 (416) 900 36 79', 'tel:+14169003679'], ['+1 (929) 237 12 55', 'tel:+19292371255'], ['+38 (063) 659 91 55', 'tel:+380636599155']]) {
      const link = page.locator('main').locator(`a[href="${tel}"]`);
      await expect(link).toHaveText(text);
      const flag = link.locator('xpath=ancestor::*[.//img or .//svg][1]').locator('img, svg').first();
      await expect.soft(flag, `${text}: flag`).toBeVisible();
    }
  });

  test(qase(25321, 'Contact — hi@devit.group opens mail client'), async ({ page }) => {
    const mail = page.locator('main a[href="mailto:hi@devit.group"]').first();
    await expect(mail).toBeVisible();
    const before = await mail.evaluate((e) => getComputedStyle(e).color + getComputedStyle(e).textDecorationLine);
    await mail.hover();
    await page.waitForTimeout(300);
    expect.soft(await mail.evaluate((e) => getComputedStyle(e).color + getComputedStyle(e).textDecorationLine), 'no hover state').not.toBe(before);
  });

  test(qase(25322, "Contact — 'Start cooperation' opens cooperation form"), async ({ page, modals }) => {
    const btn = page.getByRole('button', { name: /Start cooperation/i }).or(page.getByText('Start cooperation', { exact: true })).first();
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(modals.pipedriveIframe, "'Start cooperation' is not clickable / opens nothing").toBeVisible();
    await modals.closeButton.click();
    await expect(modals.pipedriveIframe).toBeHidden();
    await expect(page).toHaveURL(/\/contact$/);
  });
});
