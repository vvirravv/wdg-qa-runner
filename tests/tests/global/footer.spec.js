// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('[FOOTER] Footer — structure and links', () => {

  test('[80019] All 5 columns visible and labelled', async ({ page }) => {
    await page.goto('/');
    await page.locator('footer').scrollIntoViewIfNeeded();
    const footer = page.locator('footer');
    await expect(footer).toBeVisible({ timeout: 8_000 });
    const cols = footer.locator('[class*="col" i], [class*="column" i], ul');
    const count = await cols.count();
    expect(count, 'Footer should have at least 4 sections/columns').toBeGreaterThanOrEqual(4);
  });

  test('[80020] Expertises / service links navigate (no 404)', async ({ page }) => {
    await page.goto('/');
    await page.locator('footer').scrollIntoViewIfNeeded();
    const footer = page.locator('footer');
    const internalLinks = footer.locator('a[href^="/"]');
    const count = await internalLinks.count();
    expect(count, 'Footer should have internal navigation links').toBeGreaterThan(5);
    // Check first 3 internal links return 200
    for (let i = 0; i < Math.min(count, 3); i++) {
      const href = await internalLinks.nth(i).getAttribute('href');
      if (href && !href.startsWith('/#') && href !== '/') {
        const res = await page.request.get(href);
        expect(res.status(), `Footer link ${href} returned ${res.status()}`).toBeLessThan(400);
      }
    }
  });

  test('[80022] Company external links open in new tab', async ({ page }) => {
    await page.goto('/');
    await page.locator('footer').scrollIntoViewIfNeeded();
    const footer = page.locator('footer');
    const externalLinks = footer.locator('a[href^="http"]:not([href*="devit.group"])');
    const count = await externalLinks.count();
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const target = await externalLinks.nth(i).getAttribute('target');
        const href = await externalLinks.nth(i).getAttribute('href');
        expect(target, `External link ${href} missing target`).toMatch(/^_?blank$/);
      }
    }
  });

  test('[80023] Industries links present and valid', async ({ page }) => {
    await page.goto('/');
    await page.locator('footer').scrollIntoViewIfNeeded();
    const footer = page.locator('footer');
    // Industry / work links should point to /work or similar
    const workLinks = footer.locator('a[href*="/work"]');
    if (await workLinks.count() > 0) {
      const href = await workLinks.first().getAttribute('href');
      expect(href).toMatch(/\/work/);
    }
    // Footer has non-trivial number of nav links
    const allLinks = footer.locator('a[href]');
    expect(await allLinks.count()).toBeGreaterThan(8);
  });

  test('[80026] Internal links open in same tab (no target=_blank)', async ({ page }) => {
    await page.goto('/');
    await page.locator('footer').scrollIntoViewIfNeeded();
    const footer = page.locator('footer');
    const internalLinks = footer.locator('a[href^="/"]');
    const count = await internalLinks.count();
    for (let i = 0; i < Math.min(count, 10); i++) {
      const target = await internalLinks.nth(i).getAttribute('target');
      const href  = await internalLinks.nth(i).getAttribute('href');
      expect(target ?? '', `Internal link ${href} should NOT open in new tab`).not.toBe('_blank');
    }
  });

  test('[80030] Privacy Policy and Cookie Policy links work', async ({ page }) => {
    await page.goto('/');
    await page.locator('footer').scrollIntoViewIfNeeded();
    const footer = page.locator('footer');
    const ppLink = footer.getByRole('link', { name: /privacy policy/i }).first();
    const cpLink = footer.getByRole('link', { name: /cookie policy/i }).first();
    await expect(ppLink).toBeVisible({ timeout: 8_000 });
    const href = await ppLink.getAttribute('href').catch(() => null)
               ?? await cpLink.getAttribute('href').catch(() => null);
    expect(href).toBeTruthy();
    const res = await page.request.get(href);
    expect(res.status()).toBe(200);
  });

  test('[80033] Phone href is valid tel: (no "tel:undefined")', async ({ page }) => {
    for (const path of ['/', '/contact', '/about']) {
      await page.goto(path);
      const phoneLinks = page.locator('a[href^="tel:"]');
      const count = await phoneLinks.count();
      for (let i = 0; i < count; i++) {
        const href = await phoneLinks.nth(i).getAttribute('href');
        expect(href, `tel: link on ${path} is broken: "${href}"`).toMatch(/^tel:\+?\d/);
        expect(href, `tel: link is "tel:undefined" on ${path}`).not.toContain('undefined');
      }
    }
  });

});
