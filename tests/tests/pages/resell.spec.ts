import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { ProductPage } from '../../src/pom/ProductPage';
import { shopifyListing } from '../../src/shopify';

test.describe('ReSell — Functional', () => {
  let app: ProductPage;
  test.beforeEach(async ({ page }) => { app = new ProductPage(page, 'resell'); await app.open(); });

  test(qase(25498, 'ReSell — hero rating, review count, CTA buttons'), async ({ page }) => {
    const hero = page.locator('main section').first();
    expect(await hero.innerText()).toMatch(/[45]\.\d/);
    await expect(page.getByRole('button', { name: 'Install' })).toBeVisible();
    await expect(app.bookDemo).toBeVisible();
    const popup = page.context().waitForEvent('page');
    await page.getByRole('button', { name: 'Install' }).click();
    await expect(await popup).toHaveURL(/apps\.shopify\.com\/resell/);
  });

  test(qase(25499, 'ReSell — results section shows 3 key metrics'), async ({ page }) => {
    const s = page.getByRole('heading', { name: 'Results merchants see with ReSell' }).locator('xpath=ancestor::section[1]');
    await s.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);
    const nums = (await s.innerText()).match(/[+$]?\d[\d.,]*[%KkBM]?/g) ?? [];
    expect(nums.length, `metrics: ${nums.join(' ')}`).toBeGreaterThanOrEqual(3);
    expect(nums.filter((n) => parseFloat(n.replace(/[^\d.]/g, '')) === 0)).toEqual([]);
  });

  test(qase(25500, 'ReSell — sales channels: 5 tabs switch content'), async ({ page }) => {
    const tabs = page.locator('section#features').getByRole('button', { name: 'industries button' });
    await expect(tabs).toHaveText(['Checkout Page', 'Post-Purchase', 'Thank you Page', 'Order Status Page', 'POS Terminal']);
    const section = page.locator('section#features');
    let prev = await section.innerText();
    for (let i = 1; i < 5; i++) {
      await tabs.nth(i).click();
      await expect.poll(() => section.innerText()).not.toBe(prev);
      prev = await section.innerText();
    }
    await expect.soft(tabs.first(), 'channel tabs use aria-label "industries button"').not.toHaveAccessibleName('industries button');
  });

  test(qase(25501, 'ReSell — Monthly/Yearly toggles plan prices'), async () => {
    await app.pricing.scrollIntoViewIfNeeded();
    const monthly = await app.prices();
    expect(monthly.join(' ')).toContain('$39.99');
    await app.yearly.click();
    await expect.poll(() => app.prices()).not.toEqual(monthly);
    await expect(app.pricing.getByText('20% Save')).toBeVisible();
    await app.monthly.click();
    await expect.poll(() => app.prices()).toEqual(monthly);
  });

  test(qase(25502, 'ReSell — order volume slider updates recommendation'), async () => {
    await app.pricing.scrollIntoViewIfNeeded();
    await expect(app.volumeInput).toHaveValue(/^0?$/);
    const text0 = await app.pricing.innerText();
    await app.setVolume(500);
    await expect(app.volumeInput).toHaveValue('500');
    const max = Number(await app.volumeSlider.getAttribute('max'));
    await app.setVolume(max);
    await expect(app.volumeInput).toHaveValue(String(max));
    expect(await app.pricing.innerText()).not.toBe(text0);
  });

  test(qase(25503, 'ReSell — plan CTAs link to Shopify App Store'), async ({ page }) => {
    await app.pricing.scrollIntoViewIfNeeded();
    const ctas = app.pricing.getByRole('button', { name: /free trial|Get started/i }).or(app.pricing.getByRole('link', { name: /free trial/i }));
    const n = await ctas.count();
    expect(n).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < Math.min(n, 4); i++) {
      const popup = page.context().waitForEvent('page', { timeout: 10_000 });
      await ctas.nth(i).click();
      const tab = await popup;
      await expect(tab).toHaveURL(/apps\.shopify\.com/);
      await tab.close();
    }
  });

  test(qase(25504, 'ReSell — reviews carousel shows cards and navigates'), async ({ page }) => {
    await app.reviews.scrollIntoViewIfNeeded();
    const cards = app.reviews.getByRole('heading', { level: 3 });
    expect(await cards.count()).toBeGreaterThan(0);
    const before = await app.reviews.innerHTML();
    await app.reviews.locator('button').filter({ visible: true }).last().click();
    await page.waitForTimeout(500);
    expect(await app.reviews.innerHTML()).not.toBe(before);
  });

  test(qase(25505, 'ReSell — FAQ: 10 questions expand and collapse'), async () => {
    await expect(app.faqItems).toHaveCount(10);
    for (let i = 0; i < 10; i++) {
      await app.faqItems.nth(i).click();
      await expect(app.faqItems.nth(i)).toHaveAttribute('aria-expanded', 'true');
      await app.faqItems.nth(i).click();
      await expect(app.faqItems.nth(i)).toHaveAttribute('aria-expanded', 'false');
    }
  });

  test(qase(25506, "ReSell — 'Join affiliate program' is not broken"), async ({ page, modals }) => {
    const btn = page.getByRole('button', { name: 'lets talk button' }).filter({ hasText: 'Join affiliate program' });
    await btn.scrollIntoViewIfNeeded();
    const popup = page.context().waitForEvent('page', { timeout: 8_000 }).catch(() => null);
    await btn.click();
    const tab = await popup;
    if (tab) expect(tab.url()).not.toMatch(/404/);
    else await expect(modals.pipedriveIframe).toBeVisible();
  });

  test.describe('cookies accepted', () => {
    test.use({ consent: 'accept' });
    test(qase(25507, "ReSell — 'Talk to enterprise team' opens chat/contact"), async ({ modals }) => {
      await app.enterprise.click();
      await expect(modals.anyChatWidget.or(modals.pipedriveIframe)).toBeVisible({ timeout: 15_000 });
    });
    test(qase(25514, 'ReSell — live chat opens on ReSell page'), async ({ page, modals }) => {
      await page.getByRole('button', { name: 'open live chat button' }).first().click();
      await expect(modals.anyChatWidget).toBeVisible({ timeout: 15_000 });
    });
  });

  test(qase(25508, "ReSell — 'Other Shopify Apps' section with app cards"), async ({ page }) => {
    const s = page.getByRole('heading', { name: 'Other Shopify Apps by DevIT' }).locator('xpath=ancestor::section[1]');
    await expect(s, "'Other Shopify Apps by DevIT' section missing on /resell").toBeVisible();
    for (const a of ['React Flow', 'Lably', 'Selecty']) await expect.soft(s.getByRole('heading', { name: a }).first()).toBeVisible();
  });

  test(qase(25509, "ReSell — 'Help Center' link is not broken"), async ({ page, request }) => {
    const href = (await page.locator('section#contacts a').filter({ hasText: 'Help Center' }).getAttribute('href'))!;
    expect(href).toMatch(/help\.devit\.software/);
    expect((await request.get(href)).status()).toBe(200);
  });

  test(qase(25510, 'ReSell — Shopify App Store link in header opens install page'), async () => {
    await expect(app.appStoreHeaderLink).toHaveAttribute('target', '_blank');
    await expect(app.appStoreHeaderLink).toHaveAttribute('href', /apps\.shopify\.com\/resell/);
  });

  test(qase(25511, 'ReSell — reviews link to Shopify App Store reviews'), async () => {
    const link = app.reviews.locator('a[href*="apps.shopify.com/resell"]').first();
    await expect(link, 'no link to App Store reviews in reviews section').toBeVisible();
    await expect(link).toHaveAttribute('target', '_blank');
  });

  test(qase(25512, "ReSell — 'View demo store' opens resell-demo.myshopify.com"), async ({ page }) => {
    await expect(app.demoStore).toHaveAttribute('href', 'https://resell-demo.myshopify.com/');
    await expect(app.demoStore).toHaveAttribute('target', '_blank');
    const popup = page.context().waitForEvent('page');
    await app.demoStore.click();
    const tab = await popup;
    await expect(tab).toHaveURL(/resell-demo\.myshopify\.com/);
  });

  test(qase(25513, "ReSell — 'Other Shopify Apps by DevIT' cross-links to React Flow"), async ({ page }) => {
    const link = page.locator('main a[href*="react-flow"]').filter({ hasText: 'React Flow' }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /\/react-flow|apps\.shopify\.com\/react-flow/);
  });

  test(qase(25515, 'ReSell — rating & review count match Shopify App Store (partial)'), async ({ page, request }) => {
    const store = await shopifyListing(request, 'resell');
    const heading = await app.reviews.getByRole('heading', { level: 2 }).innerText();
    const site = Number(heading.match(/Rated ([\d.]+)/)![1]);
    expect(Math.abs(site - store.rating), `site ${site} vs App Store ${store.rating}`).toBeLessThanOrEqual(0.1);
    const count = Number((await page.locator('main').innerText()).match(/([\d,]+)\+?\s*reviews/i)?.[1]?.replace(/,/g, '') ?? 0);
    if (count) expect.soft(count, `site review count vs store ${store.reviews}`).toBeGreaterThanOrEqual(store.reviews * 0.9);
  });

  test(qase(25518, 'ReSell — pricing plans formatted, yearly shows 20% save'), async () => {
    await app.pricing.scrollIntoViewIfNeeded();
    const prices = await app.prices();
    for (const p of ['$14.99', '$24.99', '$39.99']) expect.soft(prices.join(' '), p).toContain(p);
    await app.yearly.click();
    await expect(app.pricing.getByText('20% Save')).toBeVisible();
  });

  test(qase(25528, 'ReSell — review cards display country label'), async () => {
    await app.reviews.scrollIntoViewIfNeeded();
    const card = app.reviews.getByRole('heading', { level: 3 }).first().locator('xpath=ancestor::*[self::li or contains(@class,"card")][1]');
    await expect(card).toContainText(/Germany|Ireland|Kingdom|United|Emirates|Oman|Israel|Australia|Canada|Norway|Poland|Netherlands|France|Spain|Italy|Denmark|Taiwan/);
  });

  test(qase(25532, 'ReSell — review slider: total count visible, navigation both ways'), async ({ page }) => {
    await app.reviews.scrollIntoViewIfNeeded();
    const counter = app.reviews.getByText(/^\d+ \/ \d+$/).first();
    await expect(counter).toBeVisible();
    const total = Number((await counter.innerText()).split('/')[1]);
    expect(total).toBeGreaterThan(0);
    const btns = app.reviews.locator('button').filter({ visible: true });
    await btns.last().click();
    await expect(counter).toHaveText(/^2 \//);
    await btns.nth((await btns.count()) - 2).click();
    await expect(counter).toHaveText(/^1 \//);
    await page.waitForTimeout(100);
  });
});

test.describe('ReSell — Local Growth by market (partial)', () => {
  for (const [id, tz, geo, market] of [[25516, 'Europe/Kyiv', { latitude: 50.45, longitude: 30.52 }, /Ukraine|Europe/], [25517, 'America/Toronto', { latitude: 43.65, longitude: -79.38 }, /Canada/]] as const) {
    test(qase(id, `ReSell — 'Local Growth' shows merchant count for ${tz}`), async ({ browser }) => {
      const ctx = await browser.newContext({ timezoneId: tz, geolocation: geo, permissions: ['geolocation'], viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await page.goto('/resell');
      const s = page.getByText(/LOCAL GROWTH/i).first();
      await expect(s, "'Local Growth' section missing").toBeVisible();
      const block = s.locator('xpath=ancestor::section[1]');
      await expect(block).toContainText(/\d+\s+merchants/i);
      await expect.soft(block).toContainText(market);
      await ctx.close();
    });
  }
});
