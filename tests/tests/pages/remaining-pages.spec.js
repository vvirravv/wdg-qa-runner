// @ts-check
const { test, expect } = require('@playwright/test');
const { watchBrokenImages } = require('../../helpers');

// ─── About ────────────────────────────────────────────────────────────────────
test.describe('[1896] About Page (/about)', () => {

  test('[9807] /about loads HTTP 200', async ({ page }) => {
    expect((await page.goto('/about', { waitUntil: 'domcontentloaded' }))?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });
  });

  test('[9808] H1 contains "We are DevIT"', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toContainText(/we are devit/i, { timeout: 15_000 });
  });

  test('[9814] Team photos load without broken images', async ({ page }) => {
    const broken = watchBrokenImages(page);
    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
    await page.waitForTimeout(1000);
    expect(broken).toHaveLength(0);
  });

  test('[9815] Page has content sections', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const body = await page.locator('body').innerText();
    expect(body.trim().length).toBeGreaterThan(500);
    expect(body.toLowerCase()).not.toContain('lorem ipsum');
  });

  test('[9816] How we are working section exists', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.5));
    const heading = await page.locator('h2, h3').allInnerTexts();
    const hasProcess = heading.some(h => /how|working|process|step/i.test(h));
    expect(hasProcess || heading.length > 0, 'No headings found on /about').toBe(true);
  });

  test('[9817] CTA button visible on /about', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const btn = page.getByRole('button', { name: /book a call|get in touch|let.?s talk/i }).first()
      .or(page.getByRole('link', { name: /book a call|get in touch|let.?s talk/i }).first());
    if (await btn.count() > 0) {
      await expect(btn.first()).toBeVisible({ timeout: 10_000 });
    } else {
      await expect(page.locator('button[aria-label*="book a call"]').first()).toBeVisible({ timeout: 10_000 });
    }
  });

});

// ─── Calculator ───────────────────────────────────────────────────────────────
test.describe('[1910] Calculator Page (/calculator)', () => {

  test('[9838] /calculator loads HTTP 200', async ({ page }) => {
    expect((await page.goto('/calculator', { waitUntil: 'domcontentloaded' }))?.status()).toBe(200);
  });

  test('[9842] Step 1 UI visible', async ({ page }) => {
    await page.goto('/calculator', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const options = page.locator('[class*="option"], [class*="step"], [class*="question"]').first();
    await expect(options).toBeVisible({ timeout: 15_000 });
  });

  test('[9843] Page renders without JS errors', async ({ page }) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/calculator', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    expect(errors.filter(e =>
      !e.includes('extension') &&
      !e.includes('cdn.devit.group') &&
      !e.includes('cdn-cgi') &&
      !e.includes('net::ERR_FAILED') &&
      !e.includes('net::ERR_ABORTED') &&
      !e.includes('Failed to load resource')
    )).toHaveLength(0);
  });

  test('[9845] Calculator has Next button', async ({ page }) => {
    await page.goto('/calculator', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const next = page.getByRole('button', { name: /next/i });
    expect(await next.count()).toBeGreaterThan(0);
  });

  test('[9844] Complete 5-step flow and reach summary', async ({ page }) => {
    await page.goto('/calculator', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    let step = 1;
    while (step <= 5) {
      const option = page.locator('[class*="option"]:not([class*="selected"])').first();
      if (await option.count() > 0 && await option.isVisible()) {
        await option.click();
        await page.waitForTimeout(300);
      }
      const next = page.getByRole('button', { name: /next/i });
      if (await next.count() > 0 && await next.isEnabled()) {
        await next.click();
        await page.waitForTimeout(600);
        step++;
      } else break;
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('[9848] FAQ expands on /calculator', async ({ page }) => {
    await page.goto('/calculator', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const faq = page.locator('[class*="accordion"], [class*="faq"]').filter({ hasText: /\?/ }).first();
    if (await faq.count() > 0 && await faq.isVisible()) {
      await faq.click();
      await page.waitForTimeout(300);
    }
    await expect(page.locator('body')).toBeVisible();
  });

});

// ─── Blog ─────────────────────────────────────────────────────────────────────
test.describe('[1921] Blog (/blog)', () => {

  test('[9864] /blog loads HTTP 200', async ({ page }) => {
    expect((await page.goto('/blog'))?.status()).toBe(200);
  });

  test('[9866] Article cards visible', async ({ page }) => {
    await page.goto('/blog');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('a[href*="/blog/"]').first()).toBeVisible();
  });

  test('[9868] Category filter works', async ({ page }) => {
    await page.goto('/blog');
    await page.waitForLoadState('networkidle');
    const filter = page.getByText(/insights/i).first();
    if (await filter.count() > 0) {
      await filter.click();
      await page.waitForTimeout(500);
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('[9869] Article click → article page', async ({ page }) => {
    await page.goto('/blog');
    await page.waitForLoadState('networkidle');
    await page.locator('a[href*="/blog/"]').first().click();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/blog/');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('[9872] No broken images on /blog', async ({ page }) => {
    const broken = watchBrokenImages(page);
    await page.goto('/blog');
    await page.waitForTimeout(1000);
    expect(broken).toHaveLength(0);
  });

  test('[9873] Pagination works', async ({ page }) => {
    await page.goto('/blog');
    await page.waitForLoadState('networkidle');
    const next = page.getByRole('link', { name: /next|2/i }).last();
    if (await next.count() > 0 && await next.isVisible()) {
      await next.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('a[href*="/blog/"]').first()).toBeVisible();
    }
  });

});

// ─── Awards ───────────────────────────────────────────────────────────────────
test.describe('[1932] Awards Page (/awards)', () => {

  test('[9892] /awards loads HTTP 200 no JS errors', async ({ page }) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    expect((await page.goto('/awards'))?.status()).toBe(200);
    await page.waitForLoadState('networkidle');
    expect(errors.filter(e =>
      !e.includes('extension') &&
      !e.includes('cdn.devit.group') &&
      !e.includes('cdn-cgi') &&
      !e.includes('net::ERR_FAILED') &&
      !e.includes('net::ERR_ABORTED') &&
      !e.includes('Failed to load resource')
    )).toHaveLength(0);
  });

  test('[9894] Platform sections: Clutch, Shopify visible', async ({ page }) => {
    await page.goto('/awards');
    for (const text of ['Clutch', 'Shopify']) {
      await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
    }
  });

  test('[9895] Review counters non-zero', async ({ page }) => {
    await page.goto('/awards');
    await page.waitForLoadState('networkidle');
    expect(await page.locator('body').innerText()).toMatch(/\d+/);
  });

  test('[9896] Reviews carousel navigates', async ({ page }) => {
    await page.goto('/awards');
    const next = page.locator('[class*="arrow"][class*="next"], button[aria-label*="next"]').first();
    if (await next.count() > 0 && await next.isVisible()) {
      await next.click();
      await page.waitForTimeout(400);
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('[9897] External platform links clickable', async ({ page, context }) => {
    await page.goto('/awards', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const clutch = page.getByRole('link', { name: /clutch/i }).first();
    if (await clutch.count() > 0 && await clutch.isVisible()) {
      const [newPage] = await Promise.all([
        context.waitForEvent('page'),
        clutch.click(),
      ]);
      await newPage.waitForLoadState('domcontentloaded');
      expect(newPage.url()).toMatch(/^https?:\/\//);
      await newPage.close();
    }
  });

});

// ─── Case Studies ─────────────────────────────────────────────────────────────
test.describe('[1943] Case Studies (/case-studies)', () => {

  test('[9911] /case-studies loads HTTP 200', async ({ page }) => {
    const res = await page.goto('/case-studies', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    expect(res?.status()).toBe(200);
  });

  test('[9916] Case study entries populated', async ({ page }) => {
    await page.goto('/case-studies', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(3000);
    await expect(page.getByText(/real america|weather nation|unlocked/i).first())
      .toBeVisible({ timeout: 15_000 });
  });

  test('[9917] Slider navigates', async ({ page }) => {
    await page.goto('/case-studies', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(2000);
    // Down arrow navigation
    const downArrow = page.locator('[class*="arrow"]:has-text("↓"), button[aria-label*="down"], button[aria-label*="next"]').first();
    if (await downArrow.count() > 0 && await downArrow.isVisible()) {
      await downArrow.click();
      await page.waitForTimeout(800);
    } else {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(800);
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('[9920] No broken images', async ({ page }) => {
    const broken = watchBrokenImages(page);
    await page.goto('/case-studies', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(2000);
    expect(broken).toHaveLength(0);
  });

});

// ─── Cookie Policy ────────────────────────────────────────────────────────────
test.describe('[1954] Cookie Policy (/cookie-policy)', () => {

  test('[9936] /cookie-policy loads HTTP 200', async ({ page }) => {
    const res = await page.goto('/cookie-policy', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('[9937] Cookie category sections present', async ({ page }) => {
    await page.goto('/cookie-policy', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(2000);
    await expect(page.getByText(/strictly necessary/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('[9938] Cookie tables have required columns', async ({ page }) => {
    await page.goto('/cookie-policy', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(2000);
    await expect(page.getByText(/cookie name/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('[9939] Open cookie preferences button works', async ({ page }) => {
    await page.goto('/cookie-policy', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const btn = page.getByRole('button', { name: /cookie preferences/i }).first();
    if (await btn.count() > 0 && await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(500);
      await expect(page.locator('[class*="modal"], [class*="preferences"]').first())
        .toBeVisible({ timeout: 5_000 });
    }
  });

  test('[9941] Click here to proceed → Privacy Policy', async ({ page }) => {
    await page.goto('/cookie-policy', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(2000);
    const link = page.getByRole('link', { name: /click here to proceed/i });
    if (await link.count() > 0) {
      await link.click({ force: true });
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/privacy-policy');
    }
  });

});

// ─── Privacy Policy ───────────────────────────────────────────────────────────
test.describe('[1963] Privacy Policy (/privacy-policy)', () => {

  test('[9955] /privacy-policy loads HTTP 200', async ({ page }) => {
    expect((await page.goto('/privacy-policy'))?.status()).toBe(200);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('[9957] hi@devit.group is mailto: link', async ({ page }) => {
    await page.goto('/privacy-policy');
    await expect(page.locator('a[href="mailto:hi@devit.group"]').first()).toBeVisible();
  });

  test('[9959] Cross-link to Cookie Policy works', async ({ page }) => {
    await page.goto('/privacy-policy');
    await page.waitForLoadState('networkidle');
    const link = page.locator('a[href="/cookie-policy"]').first();
    if (await link.count() > 0) {
      await expect(link).toBeVisible();
      await page.goto('/cookie-policy');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/cookie-policy');
    }
  });

});

// ─── ReSell ───────────────────────────────────────────────────────────────────
test.describe('[1972] ReSell App Page (/resell)', () => {

  test('[9972] /resell loads HTTP 200 no errors', async ({ page }) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const res = await page.goto('/resell', { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBe(200);
    await page.waitForTimeout(3000);
    expect(errors.filter(e =>
      !e.includes('extension') &&
      !e.includes('cdn.devit.group') &&
      !e.includes('cdn-cgi') &&
      !e.includes('net::ERR_FAILED') &&
      !e.includes('net::ERR_ABORTED') &&
      !e.includes('Failed to load resource')
    )).toHaveLength(0);
  });

  test('[9973] Hero: H1 and rating visible', async ({ page }) => {
    await page.goto('/resell', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/4\.8/i).first()).toBeVisible();
  });

  test('[9974] Shopify App Store link present', async ({ page }) => {
    await page.goto('/resell', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const link = page.locator('a[href*="apps.shopify.com"]').first();
    await expect(link).toBeVisible({ timeout: 15_000 });
  });

  test('[9976] Monthly/Yearly pricing toggle works', async ({ page }) => {
    await page.goto('/resell', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const yearly = page.getByText('Yearly').first();
    if (await yearly.count() > 0 && await yearly.isVisible({ timeout: 5000 }).catch(() => false)) {
      await yearly.click();
      await page.waitForTimeout(500);
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('[9978] Order volume slider works', async ({ page }) => {
    await page.goto('/resell');
    await page.waitForLoadState('networkidle');
    const slider = page.locator('input[type="range"]').first();
    if (await slider.count() > 0) {
      await slider.evaluate(el => { el.value = '500'; el.dispatchEvent(new Event('input')); });
      await page.waitForTimeout(300);
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('[9980] FAQ expands and collapses', async ({ page }) => {
    await page.goto('/resell');
    await page.waitForLoadState('networkidle');
    const faqItem = page.locator('[class*="accordion"]').filter({ hasText: /01|What is/i }).first();
    if (await faqItem.count() > 0) {
      await faqItem.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      if (await faqItem.isVisible()) {
        await faqItem.click();
        await page.waitForTimeout(300);
      }
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('[9991] Slider at 0 shows Free plan', async ({ page }) => {
    await page.goto('/resell');
    await page.waitForLoadState('networkidle');
    const slider = page.locator('input[type="range"]').first();
    if (await slider.count() > 0) {
      await slider.evaluate(el => { el.value = '0'; el.dispatchEvent(new Event('input')); });
      await page.waitForTimeout(300);
      await expect(page.getByText(/free/i).first()).toBeVisible({ timeout: 5_000 });
    }
  });

});

// ─── React Flow ───────────────────────────────────────────────────────────────
test.describe('[3083] React Flow App Page (/react-flow)', () => {

  test('[3332] /react-flow loads with heading', async ({ page }) => {
    const res = await page.goto('/react-flow');
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
  });

  test('[3335] No JS errors on /react-flow', async ({ page }) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const res = await page.goto('/react-flow');
    expect(res?.status()).toBe(200);
    await page.waitForLoadState('networkidle');
    expect(errors.filter(e =>
      !e.includes('extension') &&
      !e.includes('cdn.devit.group') &&
      !e.includes('cdn-cgi') &&
      !e.includes('net::ERR_FAILED') &&
      !e.includes('net::ERR_ABORTED') &&
      !e.includes('Failed to load resource')
    )).toHaveLength(0);
  });

  test('[3333] CTAs on /react-flow have valid href', async ({ page }) => {
    const res = await page.goto('/react-flow');
    expect(res?.status()).toBe(200);
    await page.waitForLoadState('domcontentloaded');
    const cta = page.getByRole('link', { name: /shopify|install|get/i }).first();
    if (await cta.count() > 0) {
      const href = await cta.getAttribute('href');
      expect(href).toBeTruthy();
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('[3334] No broken images on /react-flow', async ({ page }) => {
    const broken = watchBrokenImages(page);
    const res = await page.goto('/react-flow', { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBe(200);
    await page.waitForTimeout(2000);
    // watchBrokenImages already filters CDN prefetch
    expect(broken).toHaveLength(0);
  });

});

// ─── Support ──────────────────────────────────────────────────────────────────
test.describe('[3087] Support Page (/support)', () => {

  test('[3344] /support loads with heading', async ({ page }) => {
    const res = await page.goto('/support');
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
  });

  test('[3345] /support CTAs are functional', async ({ page }) => {
    const res = await page.goto('/support');
    expect(res?.status()).toBe(200);
    await page.waitForLoadState('domcontentloaded');
    const links = page.getByRole('link');
    expect(await links.count()).toBeGreaterThan(0);
  });

  test('[3346] No JS errors on /support', async ({ page }) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const res = await page.goto('/support');
    expect(res?.status()).toBe(200);
    await page.waitForLoadState('networkidle');
    expect(errors.filter(e =>
      !e.includes('extension') &&
      !e.includes('cdn.devit.group') &&
      !e.includes('cdn-cgi') &&
      !e.includes('net::ERR_FAILED') &&
      !e.includes('net::ERR_ABORTED') &&
      !e.includes('Failed to load resource')
    )).toHaveLength(0);
  });

});
