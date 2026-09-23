import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { ProductPage } from '../../src/pom/ProductPage';
import { placeholderTokens } from '../../src/helpers';
import { shopifyListing } from '../../src/shopify';

test.describe('React Flow — Functional', () => {
  let app: ProductPage;
  test.beforeEach(async ({ page }) => { app = new ProductPage(page, 'react-flow'); await app.open(); });

  test(qase(25534, 'React Flow — hero: heading, rating, reviews, CTA @critical'), async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('AI-Powered Workflows for Your Store');
    expect(await page.locator('main section').first().innerText()).toMatch(/[45]\.\d/);
    await expect(page.getByRole('button', { name: 'Public Listing' })).toBeEnabled();
    await expect(app.bookDemo).toBeEnabled();
  });

  test(qase(25535, 'React Flow — CTA buttons present and clickable @critical'), async ({ page, modals }) => {
    const popup = page.context().waitForEvent('page');
    await page.getByRole('button', { name: 'Public Listing' }).click();
    await expect(await popup).toHaveURL(/apps\.shopify\.com\/react-flow/);
    await app.bookDemo.click();
    await expect(modals.functionalCookiesPopup.or(modals.calendlyIframe).or(modals.pipedriveIframe)).toBeVisible();
  });

  test(qase(25536, 'React Flow — key sections rendered'), async ({ page }) => {
    for (const h of ['Built-In AI to Streamline Your Workflow', 'Setup Checkout With Shopify Functions', 'Top Templates Used by Merchants', 'Subscription Plans', 'Help & FAQs']) {
      await expect.soft(page.getByRole('heading', { name: h, level: 2 })).toBeVisible();
    }
    expect(await placeholderTokens(page)).toEqual([]);
  });

  test(qase(25537, 'React Flow — pricing plan CTAs clickable'), async ({ page }) => {
    await app.pricing.scrollIntoViewIfNeeded();
    const cta = app.pricing.getByRole('button', { name: /Get started|free trial/i }).first();
    const popup = page.context().waitForEvent('page', { timeout: 10_000 });
    await cta.click();
    await expect(await popup).toHaveURL(/apps\.shopify\.com/);
  });

  test(qase(25538, 'React Flow — features section renders all items'), async () => {
    const f = app.page.locator('section#features');
    expect(await f.getByRole('heading', { level: 3 }).count()).toBeGreaterThanOrEqual(3);
    expect(await f.innerText()).not.toMatch(/lorem|undefined/i);
  });

  test(qase(25539, 'React Flow — Shopify App Store link opens in new tab'), async () => {
    await expect(app.appStoreHeaderLink).toHaveAttribute('href', /apps\.shopify\.com\/react-flow/);
    await expect(app.appStoreHeaderLink).toHaveAttribute('target', '_blank');
  });

  test(qase(25540, 'React Flow — rating & review count match Shopify App Store (partial)'), async ({ request }) => {
    const store = await shopifyListing(request, 'react-flow');
    const site = Number((await app.reviews.getByRole('heading', { level: 2 }).innerText()).match(/Rated ([\d.]+)/)![1]);
    expect(Math.abs(site - store.rating), `site ${site} vs App Store ${store.rating}`).toBeLessThanOrEqual(0.05);
  });

  test(qase(25541, "React Flow — 'View demo store' opens reactflow-demo.myshopify.com"), async ({ page }) => {
    await expect(app.demoStore).toHaveAttribute('href', 'https://reactflow-demo.myshopify.com/');
    await expect(app.demoStore).toHaveAttribute('target', '_blank');
    await expect(app.demoStore).toHaveAttribute('rel', /noopener/);
    const popup = page.context().waitForEvent('page');
    await app.demoStore.click();
    await expect(await popup).toHaveURL(/reactflow-demo\.myshopify\.com/);
  });

  test(qase(25542, "React Flow — 'Other Shopify Apps by DevIT' cards link to each app"), async ({ page }) => {
    const s = page.getByRole('heading', { name: 'Other Shopify Apps by DevIT' }).locator('xpath=ancestor::section[1]');
    const map: Record<string, RegExp> = { ReSell: /apps\.shopify\.com\/resell/, Lably: /apps\.shopify\.com\/lably/, Selecty: /apps\.shopify\.com\/selectors/, ShopCart: /apps\.shopify\.com\/shopcart/ };
    for (const [name, rx] of Object.entries(map)) {
      const card = s.locator('a').filter({ has: page.getByRole('heading', { name, level: 3 }) }).first();
      await expect.soft(card, name).toHaveAttribute('href', rx);
      await expect.soft(card, name).toHaveAttribute('target', '_blank');
      await expect.soft(card, `${name}: rel=noopener`).toHaveAttribute('rel', /noopener/);
    }
  });

  test(qase(25543, 'React Flow — affiliate program CTA works'), async ({ page, modals }) => {
    const btn = page.getByRole('button', { name: 'lets talk button' }).filter({ hasText: 'View Terms' });
    await btn.scrollIntoViewIfNeeded();
    const popup = page.context().waitForEvent('page', { timeout: 8_000 }).catch(() => null);
    await btn.click();
    const tab = await popup;
    if (!tab) await expect(page.locator('[class*="odal"]').filter({ visible: true }).last().or(modals.pipedriveIframe)).toBeVisible();
  });

  test.describe('cookies accepted', () => {
    test.use({ consent: 'accept' });
    test(qase(25544, 'React Flow — live chat opens'), async ({ page, modals }) => {
      await page.getByRole('button', { name: 'open live chat button' }).first().click();
      await expect(modals.anyChatWidget).toBeVisible({ timeout: 15_000 });
    });
  });

  test(qase(25545, 'React Flow — header anchor nav scrolls to sections'), async ({ page }) => {
    for (const [name, id] of [['Features', 'features'], ['Pricing', 'pricing'], ['Reviews', 'reviews'], ['Contacts', 'contacts']]) {
      await page.locator(`header a[href="/react-flow#${id}"]`).first().click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`section#${id}`), name).toBeInViewport();
    }
    await expect(app.appStoreHeaderLink).toHaveAttribute('href', /utm_source=devit\.group.*utm_medium=site|utm_medium=site.*utm_source=devit\.group/);
  });

  test(qase(25546, "React Flow — Monthly/Yearly toggles prices, '20% Save'"), async () => {
    await app.pricing.scrollIntoViewIfNeeded();
    const monthly = await app.prices();
    for (const p of ['$19', '$29', '$49']) expect.soft(monthly.join(' '), p).toContain(p);
    await app.yearly.click();
    await expect(app.pricing.getByText('20% Save')).toBeVisible();
    await expect.poll(() => app.prices()).not.toEqual(monthly);
    await app.monthly.click();
    await expect.poll(() => app.prices()).toEqual(monthly);
  });

  test(qase(25547, "React Flow — 'runs per month' slider updates recommended plan"), async () => {
    await app.pricing.scrollIntoViewIfNeeded();
    const rec = () => app.pricing.innerText().then((t) => t.match(/We recommend\s*[-–]?\s*([\w ]+)/i)?.[1]?.trim() ?? '');
    const max = Number(await app.volumeSlider.getAttribute('max'));
    const min = Number(await app.volumeSlider.getAttribute('min') ?? 0);
    const seen: string[] = [];
    for (const v of [min, 1000, 10_000, 50_000, max]) {
      await app.setVolume(v);
      await app.pricing.page().waitForTimeout(200);
      seen.push(await rec());
    }
    expect(seen[0]).toMatch(/Pay as you go|Free/i);
    expect(seen[seen.length - 1]).toMatch(/Unlimited/i);
    expect(new Set(seen).size, `recommendations: ${seen.join(' > ')}`).toBeGreaterThanOrEqual(3);
  });

  test(qase(25548, 'React Flow — FAQ: 10 questions expand/collapse, Help Center link'), async () => {
    await expect(app.faqItems).toHaveCount(10);
    for (let i = 0; i < 10; i++) {
      await app.faqItems.nth(i).click();
      await expect(app.faqItems.nth(i)).toHaveAttribute('aria-expanded', 'true');
      await app.faqItems.nth(i).click();
    }
    const help = app.page.locator('section#contacts a').filter({ hasText: 'Help Center' });
    await expect(help).toHaveAttribute('href', /help\.devit\.software\/en\/category\/react-flow/);
    await expect(help).toHaveAttribute('target', '_blank');
  });

  test(qase(25549, 'React Flow — reviews carousel navigates through slides'), async () => {
    await app.reviews.scrollIntoViewIfNeeded();
    await expect(app.reviews).toContainText(/out of 5/);
    const counter = app.reviews.getByText(/^\d+ \/ \d+$/).first();
    await expect(counter).toHaveText(/^1 \/ \d+$/);
    const total = Number((await counter.innerText()).split('/')[1]);
    const next = app.reviews.locator('button').filter({ visible: true }).last();
    for (let i = 2; i <= Math.min(total, 6); i++) {
      await next.click();
      await expect(counter).toHaveText(new RegExp(`^${i} /`));
    }
  });

  test(qase(25550, "React Flow — 'Shopify Functions' and 'Top Templates' carousels"), async ({ page }) => {
    for (const t of ['Dynamic Pricing', 'Smart Shipping Rules', 'Flexible Payments', 'Personalized Checkout']) {
      await expect.soft(page.getByRole('heading', { name: t, level: 3 }).first()).toBeAttached();
    }
    const templates = ['Add notes to tagged orders', 'Recover abandoned checkouts', 'Tag new products', 'Coupon after first order', 'Thank you message', 'Run code', 'HTTP request to API'];
    for (const t of templates) {
      const b = page.getByRole('button', { name: t, exact: true });
      await b.click();
      await expect(b).toBeVisible();
    }
    const demo = page.getByRole('button', { name: 'View demo store' }).filter({ visible: true }).first();
    const popup = page.context().waitForEvent('page');
    await demo.click();
    await expect(await popup).toHaveURL(/reactflow-demo\.myshopify\.com/);
  });
});
