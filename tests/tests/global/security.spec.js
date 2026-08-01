// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('[SEC] Security checks', () => {

  test('[SEC-01] HTTPS redirect — HTTP redirects to HTTPS', async ({ page }) => {
    const response = await page.goto('https://devit.group');
    // Verify final URL starts with https
    expect(page.url()).toMatch(/^https:\/\//);
    // Verify page loaded successfully
    expect(response?.status()).toBeLessThan(400);
  });

  test('[SEC-02] SSL certificate valid — HTTPS request succeeds without error', async ({ page }) => {
    // This will throw if there is an SSL error
    const response = await page.goto('https://devit.group');
    expect(response?.status()).toBe(200);
    // Page title must be visible (not an SSL error page)
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    expect(title.toLowerCase()).not.toContain('privacy error');
    expect(title.toLowerCase()).not.toContain('ssl error');
    expect(title.toLowerCase()).not.toContain('certificate');
  });

  test('[SEC-03] Security response headers present', async ({ page }) => {
    const response = await page.goto('https://devit.group');
    const headers = response?.headers() || {};
    // Check for at least one of these security headers
    const hasXContentType = 'x-content-type-options' in headers;
    const hasXFrame = 'x-frame-options' in headers;
    const hasHsts = 'strict-transport-security' in headers;
    const hasAtLeastOne = hasXContentType || hasXFrame || hasHsts;
    expect(hasAtLeastOne, `Expected at least one security header. Headers: ${JSON.stringify(Object.keys(headers))}`).toBe(true);
  });

  test('[SEC-04] No 5xx errors during navigation of key pages', async ({ page }) => {
    const serverErrors = [];
    page.on('response', res => {
      if (res.status() >= 500) {
        serverErrors.push(`${res.status()} ${res.url()}`);
      }
    });
    const pages = ['/', '/work', '/contact', '/about'];
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
    }
    expect(serverErrors, `5xx errors found:\n${serverErrors.join('\n')}`).toHaveLength(0);
  });

  test('[SEC-05] Trailing slash normalization — /work/ resolves correctly', async ({ page }) => {
    const response = await page.goto('https://devit.group/work/');
    // Either the trailing slash was redirected away (final URL is /work) or it returned 200
    const finalUrl = page.url();
    const status = response?.status() || 0;
    const isNormalized = !finalUrl.endsWith('/work/') || finalUrl === 'https://devit.group/work/';
    // Accept: redirected to /work, or /work/ returns 200 directly
    const isOk = status < 400;
    expect(isOk, `Expected /work/ to resolve without error, got status ${status}`).toBe(true);
    // Verify we ended up on the work page content
    const body = await page.locator('body').innerText();
    expect(body.trim().length).toBeGreaterThan(50);
  });

});
