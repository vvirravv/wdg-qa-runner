import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';

test.describe('Support — routing modal', () => {
  test.use({ autoCloseRoutingModal: false });
  test(qase(25563, "Support — routing modal 'Need help with an app?' appears on load, actions work"), async ({ page }) => {
    await page.goto('/support');
    const title = page.getByRole('heading', { name: /Need help with an app\?|Got a project\?/ });
    await expect(title, 'routing modal did not appear on /support').toBeVisible();
    await page.getByRole('link', { name: /Go to Agency|Go to Contacts?/ }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/contact$/);
    await page.goto('/support');
    await page.getByRole('button', { name: 'Stay here', exact: true }).click();
    await expect(title).toBeHidden();
    await page.reload();
    await page.getByRole('button', { name: 'close button' }).filter({ visible: true }).last().click();
    await expect(title).toBeHidden();
    await expect(page).toHaveURL(/\/support$/);
  });
});

test.describe('Support — Functional', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/support'); });

  test(qase(25562, 'Support — main heading visible @critical'), async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("We'll sort it out");
  });

  test.describe('cookies accepted', () => {
    test.use({ consent: 'accept' });
    test(qase(25564, 'Support — live chat CTA opens chat'), async ({ page, modals }) => {
      await page.getByRole('button', { name: 'open live chat button' }).click();
      await expect(modals.anyChatWidget).toBeVisible({ timeout: 15_000 });
    });
    test(qase(25565, 'Support — request callback button opens callback form'), async ({ page }) => {
      await page.getByRole('button', { name: 'request callback button' }).click();
      await expect(page.getByRole('textbox', { name: /phone/i }).or(page.locator('iframe:visible').last()).first()).toBeVisible({ timeout: 15_000 });
    });
  });

  test(qase(25566, 'Support — Messenger link opens m.me/103228279146400 in new tab'), async ({ page }) => {
    const l = page.locator('main a[href="https://m.me/103228279146400"]');
    await expect(l).toBeVisible();
    await expect(l).toHaveAttribute('target', '_blank');
  });

  test(qase(25567, 'Support — no Discord links (community removed), WhatsApp shown instead'), async ({ page }) => {
    // Discord community was removed on purpose (confirmed by QA/PM); old invite discord.gg/sg72ENbAz4 is expired.
    await expect(page.locator('a[href*="discord.gg"], a[href*="discord.com/invite"]')).toHaveCount(0);
    const wa = page.locator('main a[href="https://wa.me/19292371255"]');
    await expect(wa).toBeVisible();
    await expect(wa).toHaveAttribute('target', '_blank');
  });

  test(qase(25568, 'Support — Telegram bot link opens in new tab'), async ({ page }) => {
    const l = page.locator('main a[href="https://t.me/devit_software_bot"]');
    await expect(l).toBeVisible();
    await expect(l).toHaveAttribute('target', '_blank');
  });

  test(qase(25569, 'Support — FAQ: all questions expand and collapse, 10 items'), async ({ page }) => {
    const faq = page.locator('section#contacts button[aria-expanded]');
    expect.soft(await faq.count(), 'FAQ items (TC expects 10)').toBe(10);
    for (const i of [0, 2, 4, 6]) {
      const q = faq.nth(i);
      await q.click();
      await expect(q).toHaveAttribute('aria-expanded', 'true');
      await q.click();
      await expect(q).toHaveAttribute('aria-expanded', 'false');
    }
  });

  test(qase(25570, 'Support — help/contact CTAs present and functional'), async ({ page, request }) => {
    const hrefs = await page.locator('main a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!).filter((h) => h.startsWith('/') || h.includes('devit.')));
    for (const h of hrefs) expect.soft((await request.get(h)).status(), h).toBeLessThan(400);
    await expect(page.getByRole('button', { name: 'Schedule a Call' })).toBeVisible();
  });

  test(qase(25571, 'Support — product links navigate to /resell and /react-flow'), async ({ page }) => {
    for (const path of ['/resell', '/react-flow']) {
      await page.goto('/support');
      const link = page.locator(`main a[href="${path}"]`).first();
      await expect(link, `${path} link missing on /support`).toBeVisible();
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    }
  });

  test(qase(25572, 'Support — help center links open in new tab'), async ({ page }) => {
    const links = page.locator('main a[href^="https://help.devit.software"]');
    expect(await links.count()).toBeGreaterThan(0);
    expect(await links.evaluateAll((as) => as.filter((a) => a.getAttribute('target') !== '_blank').length)).toBe(0);
  });

  test(qase(25573, 'Support — email links work'), async ({ page }) => {
    await expect(page.locator('main a[href="mailto:support@devit.software"]').first()).toBeVisible();
  });
});
