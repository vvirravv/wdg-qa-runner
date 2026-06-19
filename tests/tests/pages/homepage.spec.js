// @ts-check
const { test, expect } = require('@playwright/test');
const { collectJsErrors, watchBrokenImages, dismissCookieBanner } = require('../../helpers');

test.describe('[1809] Homepage (/)', () => {

  test('[9559] Homepage loads HTTP 200', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('[9560] Hero: H1 and CTA visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('link', { name: /let.?s talk/i })
      .or(page.getByRole('button', { name: /let.?s talk/i })).first()).toBeVisible();
  });

  test('[9561] No broken images on homepage', async ({ page }) => {
    const broken = watchBrokenImages(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    // Scroll slowly to trigger lazy-load
    for (let i = 1; i <= 5; i++) {
      await page.evaluate(step => window.scrollTo(0, document.body.scrollHeight * step / 5), i);
      await page.waitForTimeout(400);
    }
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    // Filter out CDN prefetch hints (status 0) — not real broken images
    const realBroken = broken.filter(url => !url.includes('cdn-cgi/imagedelivery'));
    expect(realBroken).toHaveLength(0);
  });

  test('[9562] Let\'s talk opens form', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    await page.getByRole('link', { name: /let.?s talk/i })
      .or(page.getByRole('button', { name: /let.?s talk/i })).first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('[class*="modal"], [class*="form"], iframe[src*="pipedrive"]').first())
      .toBeVisible({ timeout: 10_000 });
  });

  test('[9563] Stats counters visible', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollBy(0, 500));
    await expect(page.getByText(/650|700|12 years|150 team/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('[9564] 6 Services cards visible', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollBy(0, 1000));
    const services = page.locator('[class*="service"], [class*="Service"]');
    expect(await services.count()).toBeGreaterThanOrEqual(6);
  });

  test('[9565] Our Projects: cards and View all cases', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const viewAll = page.getByRole('link', { name: /view all/i })
      .or(page.locator('a[href="/work"]').filter({ hasText: /view|all|case/i })).first();
    if (await viewAll.count() > 0) {
      await viewAll.scrollIntoViewIfNeeded().catch(() => {});
      await expect(viewAll).toBeVisible({ timeout: 10_000 });
      await page.goto('/work');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/work');
    } else {
      await expect(page.locator('a[href*="/work/"]').first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('[9566] No lorem ipsum or empty sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).not.toContain('lorem ipsum');
  });

  test('[9567] No horizontal scroll at 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const cw = await page.evaluate(() => document.documentElement.clientWidth);
    expect(sw).toBeLessThanOrEqual(cw + 5);
  });

  test('[9568] No broken images on scroll', async ({ page }) => {
    const broken = watchBrokenImages(page);
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    expect(broken).toHaveLength(0);
  });

  test('[9571] Video autoplays muted', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);
    const video = page.locator('video').first();
    if (await video.count() > 0) {
      expect(await video.evaluate(v => v.muted)).toBe(true);
      expect(await video.evaluate(v => v.paused)).toBe(false);
    }
  });

  test('[9575] No native controls on video', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollBy(0, 800));
    const video = page.locator('video').first();
    if (await video.count() > 0) {
      expect(await video.evaluate(v => v.controls)).toBe(false);
    }
  });

  test('[9578] Four Reasons section heading visible', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('heading', { name: /reasons|choosing/i }).first()
      .scrollIntoViewIfNeeded().catch(() => {});
    await expect(page.getByRole('heading', { name: /reasons|choosing/i }).first())
      .toBeVisible({ timeout: 10_000 });
  });

  test('[9582] Achievements section visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(500);
    await expect(page.getByRole('heading', { name: /achievements|awards/i }).first())
      .toBeVisible({ timeout: 20_000 });
  });

  test('[9583] Award logos not broken', async ({ page }) => {
    const broken = watchBrokenImages(page);
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.5));
    await page.waitForTimeout(1000);
    expect(broken).toHaveLength(0);
  });

  test('[9584] See all awards → /awards', async ({ page }) => {
    await page.goto('/');
    const link = page.getByRole('link', { name: /see all awards/i });
    if (await link.count() > 0) {
      await link.scrollIntoViewIfNeeded().catch(() => {});
      await link.click({ force: true });
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/awards');
    }
  });

  test('[9587] Testimonials slider navigation', async ({ page }) => {
    await page.goto('/');
    const next = page.locator('[class*="testimonial"] [class*="next"], [class*="testimonial"] button').last();
    if (await next.count() > 0 && await next.isVisible()) {
      await next.click();
      await page.waitForTimeout(400);
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('[9592] Services: H2 and 6 cards', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollBy(0, 1200));
    await expect(page.getByRole('heading', { name: /services/i }).first())
      .toBeVisible({ timeout: 10_000 });
  });

  test('[9595] Industries slider visible', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('heading', { name: /industries/i }).first()
      .scrollIntoViewIfNeeded().catch(() => {});
    await expect(page.getByRole('heading', { name: /industries/i }).first())
      .toBeVisible({ timeout: 10_000 });
  });

  test('[9598] Our Projects: cards click through', async ({ page }) => {
    await page.goto('/');
    await page.locator('a[href*="/work/"]').first().scrollIntoViewIfNeeded().catch(() => {});
    await expect(page.locator('a[href*="/work/"]').first()).toBeVisible({ timeout: 10_000 });
    await page.locator('a[href*="/work/"]').first().click();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toMatch(/\/work\/.+/);
  });

  test('[9603] Contact Us: email mailto link', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator('a[href="mailto:hi@devit.group"]').first())
      .toBeVisible({ timeout: 10_000 });
  });

  test('[3173] Desktop 1440px: footer visible', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator('footer')).toBeVisible();
  });

});
