import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { brokenImages, ownErrors, scrollThrough } from '../../src/helpers';

test.describe('Shopify — Functional', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/shopify'); });

  test(qase(25332, 'Shopify — no broken images on page'), async ({ page }) => {
    await scrollThrough(page);
    expect(await brokenImages(page)).toEqual([]);
  });

  test(qase(25333, "Shopify — hero animated text + 'EXPLORE MORE' CTA works"), async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 });
    const t1 = await h1.innerText();
    await expect.poll(() => h1.innerText(), { timeout: 12_000, message: 'hero text never changes' }).not.toBe(t1);
    const explore = page.getByRole('link', { name: 'scroll to services section' });
    await expect(explore).toBeVisible();
    await explore.click();
    await expect(page.locator('#services')).toBeInViewport();
  });

  test(qase(25334, "Shopify — 'Estimate Project' hero CTA navigates to /calculator"), async ({ page }) => {
    await page.getByRole('button', { name: 'Estimate Project' }).click();
    await expect(page).toHaveURL(/\/calculator/);
    await expect(page.getByText('Question 1 of 5')).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/shopify$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test(qase(25335, 'Shopify — service sections: 6 blocks with working CTA buttons'), async ({ page, modals }) => {
    const ctas = ['Launch My Shopify App', 'Build My New Store', 'Create My Custom App', 'Customize My Theme', 'Migrate My Store', 'Boost My Store Speed'];
    for (const name of ctas) {
      await test.step(name, async () => {
        await page.goto('/shopify');
        const btn = page.getByRole('button', { name });
        await btn.scrollIntoViewIfNeeded();
        await expect(btn).toBeVisible();
        const popup = page.context().waitForEvent('page', { timeout: 5_000 }).catch(() => null);
        await btn.click();
        const opened = await Promise.race([
          modals.pipedriveIframe.waitFor({ state: 'visible', timeout: 8_000 }).then(() => 'modal'),
          popup.then((p) => (p ? 'tab' : null)),
        ]).catch(() => null);
        expect(opened, `${name}: dead button`).toBeTruthy();
      });
    }
  });

  test(qase(25336, 'Shopify — stats: non-zero realistic values'), async ({ page }) => {
    const section = page.getByRole('heading', { name: 'Proven Shopify Results' }).locator('xpath=ancestor::section[1]');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2500); // count-up animation
    const nums = (await section.innerText()).match(/\d[\d,.]*\+?/g) ?? [];
    expect(nums.length).toBeGreaterThanOrEqual(3);
    expect(nums.map((n) => parseFloat(n.replace(/,/g, ''))).filter((n) => !n)).toEqual([]);
  });

  test(qase(25337, 'Shopify — case cards link to correct project pages'), async ({ page }) => {
    for (const [name, slug] of [['Karstgoods', 'karstgoods'], ['Bloomex', 'bloomex'], ['IQBAR', 'iqbar']]) {
      await page.goto('/shopify');
      const link = page.getByRole('link', { name: `View project ${name}` });
      await expect(link).toHaveAttribute('href', `/work/${slug}`);
      await link.click();
      await expect(page).toHaveURL(new RegExp(`/work/${slug}$`));
      await expect(page.locator('h1')).toContainText(new RegExp(name, 'i'));
    }
  });

  test(qase(25338, 'Shopify — page has no JS errors in console on load'), async ({ page, jsErrors }) => {
    await page.reload();
    await scrollThrough(page);
    expect(ownErrors(jsErrors)).toEqual([]);
  });

  test(qase(25339, "Shopify — 'Launch My Shopify App' opens target"), async ({ page, modals }) => {
    const btn = page.getByRole('button', { name: 'Launch My Shopify App' });
    await btn.scrollIntoViewIfNeeded();
    const popup = page.context().waitForEvent('page', { timeout: 8_000 }).catch(() => null);
    await btn.click();
    const tab = await popup;
    if (tab) await expect(tab).toHaveURL(/shopify\.com/);
    else {
      expect.soft(false, "TC expects external Shopify link in new tab; site opens a form instead").toBe(true);
      await expect(modals.pipedriveIframe).toBeVisible();
    }
  });

  test(qase(25340, "Shopify — bottom CTA opens contact form"), async ({ page, modals }) => {
    await page.getByRole('button', { name: 'open lets talk modal button' }).last().click();
    await expect(modals.pipedriveIframe).toBeVisible();
    await expect(modals.pipedrive.getByText('Ready for cooperation?')).toBeVisible();
  });

  test(qase(25341, "Shopify — 'Built on Experience' timeline renders"), async ({ page }) => {
    const section = page.getByRole('heading', { name: /Built on Experience/ }).locator('xpath=ancestor::section[1]');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toContainText('2016');
    await expect(section).toContainText(String(new Date().getFullYear() - 1));
  });

  test(qase(25342, 'Shopify — Tech stack carousel shows logos'), async ({ page }) => {
    const h = page.getByRole('heading', { name: 'Our Shopify Tech Stack' });
    await h.scrollIntoViewIfNeeded();
    const block = h.locator('xpath=ancestor::*[.//img][1]');
    expect(await block.locator('img, svg').count()).toBeGreaterThan(5);
  });

  test(qase(25343, "Shopify — 'See our story in motion' opens video"), async ({ page }) => {
    const btn = page.getByRole('button', { name: /See our story in motion|Open modal/ }).first();
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    const player = page.locator('video, iframe[src*="cloudflarestream"], iframe[src*="youtube"]').filter({ visible: true }).last();
    await expect(player).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'close button' }).filter({ visible: true }).last().click().catch(() => undefined);
    await expect(player).toBeHidden();
  });

  test(qase(25344, "Shopify — 'Proven Shopify Results' blocks link to filtered /work"), async ({ page }) => {
    const expected = [/tags=shopify\+store/, /tags=shopify\+app/, /platforms=shopify/];
    const links = page.locator('main a[aria-label^="open portfolio with shopify"]');
    await expect(links).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await page.goto('/shopify');
      await links.nth(i).click();
      await expect(page).toHaveURL(expected[i]);
      await expect(page.getByText(/Showing \d+ projects out of \d+/)).toBeVisible();
    }
    await expect.soft(links.nth(1), 'two stat blocks share the same aria-label').not.toHaveAccessibleName(await links.nth(2).getAttribute('aria-label') ?? '');
  });

  test(qase(25345, "Shopify — 'Conversion-Oriented Shopify Themes' cards and 'View all Themes'"), async ({ page }) => {
    for (const slug of ['ideo-skincare', 'wild-forager', 'olivia-care', 'eleven-jewelry']) {
      await page.goto('/shopify');
      await page.locator(`a[href="/work/${slug}"]`).filter({ hasText: 'View Theme' }).click();
      await expect(page).toHaveURL(new RegExp(`/work/${slug}$`));
      await expect(page.locator('h1')).toBeVisible();
    }
    await page.goto('/shopify');
    await page.getByRole('button', { name: 'View all Themes' }).click();
    await expect(page).toHaveURL(/\/work\?/);
    test.info().annotations.push({ type: 'view-all-themes-url', description: page.url() });
  });

  test(qase(25346, "Shopify — 'Explore Our Apps' buttons navigate correctly"), async ({ page }) => {
    const store = page.getByRole('link', { name: /Shopify App Store/ }).or(page.getByRole('button', { name: /Shopify App Store/ })).first();
    await store.scrollIntoViewIfNeeded();
    const popup = page.context().waitForEvent('page');
    await store.click();
    const tab = await popup;
    await expect(tab).toHaveURL(/apps\.shopify\.com\/partners\/devit.*utm_source=devit\.group/);
    await tab.close();
    await page.getByRole('link', { name: /Our Portfolio/ }).or(page.getByRole('button', { name: /Our Portfolio/ })).first().click();
    await expect(page).toHaveURL(/\/work/);
  });
});

test.describe('Shopify — Reviews', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shopify');
    await page.getByRole('heading', { name: /Trusted\. Proven\. Rated/ }).scrollIntoViewIfNeeded();
  });
  const section = (page: import('@playwright/test').Page) => page.getByRole('heading', { name: /Trusted\. Proven\. Rated/ }).locator('xpath=ancestor::section[1]');

  test(qase(25352, 'Shopify — review cards display country/region label @critical'), async ({ page }) => {
    const cards = section(page).getByRole('heading', { level: 3 });
    const n = Math.min(await cards.count(), 6);
    for (let i = 0; i < n; i++) {
      const card = cards.nth(i).locator('xpath=ancestor::*[self::li or self::article or contains(@class,"card")][1]');
      await expect.soft(card, `card ${i}: no country label`).toContainText(/Germany|United|Canada|States|Kingdom|Netherlands|Norway|Ukraine|Australia|France|Spain|Italy|Poland|Denmark|Sweden|Ireland|Israel|Oman|Emirates|Austria|Switzerland|Belgium|Finland/);
    }
  });

  test(qase(25356, 'Shopify — reviews can be filtered by app name'), async ({ page }) => {
    const tab = section(page).getByRole('button', { name: /^React Flow$/ }).or(section(page).getByRole('tab', { name: /React Flow/ })).first();
    await expect(tab, 'no app filter/tabs in reviews').toBeVisible();
    await tab.click();
    const apps = await section(page).getByRole('heading', { level: 3 }).filter({ visible: true }).allInnerTexts();
    expect(apps.every((a) => a === 'React Flow')).toBe(true);
  });

  test(qase(25357, 'Shopify — review slider prev/next works'), async ({ page }) => {
    const s = section(page);
    const counter = s.getByText(/^\d+ \/ \d+$/).first();
    const buttons = s.locator('button').filter({ visible: true });
    const before = await s.innerText();
    await buttons.last().click();
    await page.waitForTimeout(600);
    expect(await s.innerText()).not.toBe(before);
    await buttons.nth((await buttons.count()) - 2).click();
    if (await counter.count()) await expect(counter).toHaveText(/^1 \//);
  });

  test(qase(25358, 'Shopify — app rating displayed; SSR value equals rendered value'), async ({ page, request }) => {
    const h2 = page.getByRole('heading', { name: /Trusted\. Proven\. Rated/ });
    const rendered = (await h2.innerText()).match(/Rated ([\d.]+)/)![1];
    expect(Number(rendered)).toBeGreaterThanOrEqual(4);
    await expect(section(page)).toContainText(/out of 5/);
    const html = await (await request.get('/shopify')).text();
    expect(html.match(/Rated\s*(?:<!-- -->)?\s*([\d.]+)/)?.[1], 'rating jumps after hydration').toBe(rendered);
  });

  test(qase(25359, 'Shopify — in-house apps carousel shows apps with ratings'), async ({ page }) => {
    const h = page.getByText(/In-House Apps/i).first();
    await h.scrollIntoViewIfNeeded();
    const block = h.locator('xpath=ancestor::section[1]');
    for (const app of ['React Flow', 'ReSell', 'Lably', 'Selecty', 'ShopCart']) await expect.soft(block.getByText(app).first(), app).toBeVisible();
    expect((await block.innerText()).match(/\b[45]\.\d\b/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });
});
