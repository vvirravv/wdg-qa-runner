import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';

test.describe('Awards — Functional', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/awards'); });

  test(qase(25439, 'Awards — all platform sections visible with titles'), async ({ page }) => {
    for (const [h, link] of [['Clutch', 'Clutch Profile'], ['Shopify Expert', 'Shopify App Store'], ['Shopify Partners', 'Shopify Partners'], ['Goodfirms', 'See Us on GoodFirms'], ['DesignRush', 'Our DesignRush Profile'], ['Upwork', 'Upwork Agency']]) {
      await expect.soft(page.getByRole('heading', { name: h, exact: true, level: 3 }).first(), h).toBeVisible();
      await expect.soft(page.getByRole('link', { name: link, exact: true }).first(), link).toBeVisible();
    }
  });

  test(qase(25440, 'Awards — review counts are numeric and non-zero'), async ({ page }) => {
    for (const h of ['Shopify Expert', 'DesignRush', 'Upwork']) {
      const block = page.getByRole('heading', { name: h, level: 3 }).first().locator('xpath=ancestor::section[1]');
      const nums = ((await block.innerText()).match(/\d[\d,]*/g) ?? []).map((n) => Number(n.replace(/,/g, '')));
      expect.soft(nums.some((n) => n > 0), `${h}: no non-zero review count`).toBe(true);
    }
  });

  test(qase(25441, 'Awards — review carousel displays and navigates'), async ({ page }) => {
    const s = page.getByRole('heading', { name: 'DesignRush', level: 3 }).first().locator('xpath=ancestor::section[1]');
    const btns = s.locator('button').filter({ visible: true });
    test.skip(!(await btns.count()), 'no carousel arrows');
    const before = await s.innerHTML();
    await btns.last().click();
    await page.waitForTimeout(500);
    expect(await s.innerHTML()).not.toBe(before);
    await btns.first().click();
  });

  test(qase(25442, 'Awards — external platform links are valid'), async ({ page, request }) => {
    for (const name of ['Clutch Profile', 'Shopify App Store', 'See Us on GoodFirms', 'Upwork Agency']) {
      const href = (await page.getByRole('link', { name, exact: true }).first().getAttribute('href'))!;
      expect.soft(href, name).toMatch(/^https:\/\//);
      if (/shopify/.test(href)) expect.soft((await request.get(href)).status(), href).toBeLessThan(400);
    }
  });

  test(qase(25443, "Awards — 'Let's talk' CTA opens the form in place (partial)"), async ({ page, modals }) => {
    await page.getByRole('button', { name: 'open lets talk modal button' }).last().click();
    await expect(modals.pipedriveIframe).toBeVisible();
    await expect(page).toHaveURL(/\/awards$/);
  });

  test(qase(25444, 'Awards — Clutch links to DevIT Clutch profile'), async ({ page }) => {
    const l = page.getByRole('link', { name: 'Clutch Profile' });
    await expect(l).toHaveAttribute('href', 'https://clutch.co/profile/devit');
    await expect(l).toHaveAttribute('target', '_blank');
  });

  test(qase(25445, 'Awards — Shopify Partner badge links to Shopify Partner directory'), async ({ page }) => {
    const l = page.getByRole('link', { name: 'Shopify Partners', exact: true });
    await expect(l).toHaveAttribute('href', /shopify\.com\/partners\/directory\/partner\/devit/);
    await expect(l).toHaveAttribute('target', '_blank');
  });

  test(qase(25446, 'Awards — GoodFirms / other platform links open in new tab'), async ({ page }) => {
    for (const name of ['See Us on GoodFirms', 'Our DesignRush Profile', 'Upwork Agency']) {
      await expect.soft(page.getByRole('link', { name, exact: true }).first()).toHaveAttribute('target', '_blank');
    }
    const popup = page.context().waitForEvent('page');
    await page.getByRole('link', { name: 'See Us on GoodFirms' }).click();
    await expect(await popup).toHaveURL(/goodfirms\.co/);
    await expect(page).toHaveURL(/\/awards$/);
  });

  test(qase(25447, "Awards — 'Share Your Experience' opens Clutch review form"), async ({ page }) => {
    const l = page.getByRole('link', { name: 'Share Your Experience' });
    await expect(l).toHaveAttribute('href', 'https://review.clutch.co/review/?provider_id=1701630');
    await expect(l).toHaveAttribute('target', '_blank');
  });
});
