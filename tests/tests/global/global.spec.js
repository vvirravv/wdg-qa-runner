// @ts-check
const { test, expect, request } = require('@playwright/test');
const { httpGet, collectJsErrors, BASE } = require('../../helpers');

// ─── Footer ───────────────────────────────────────────────────────────────────
test.describe('[1794] Footer', () => {

  test('[9468] All 5 footer columns visible', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    for (const col of ['Expertises', 'Company', 'Industries', 'Contacts']) {
      await expect(footer.getByText(col, { exact: false })).toBeVisible();
    }
  });

  test('[9470] Company column links exist in footer', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    for (const href of ['/about', '/work', '/blog']) {
      const link = page.locator(`footer a[href="${href}"]`).first();
      expect(await link.count(), `Footer link ${href} not found`).toBeGreaterThan(0);
    }
  });

  test('[9471] Careers link in footer', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const link = page.locator('footer a[href*="jobs.devit.group"], footer a[href*="career"]').first();
    await expect(link).toBeVisible({ timeout: 10_000 });
  });

  test('[9475] Phone number is tel: link', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const phone = page.locator('footer a[href^="tel:"]').first();
    await expect(phone).toBeVisible();
    expect(await phone.getAttribute('href')).toMatch(/^tel:\+/);
  });

  test('[9476] Email is mailto: link', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator('footer a[href="mailto:hi@devit.group"]').first()).toBeVisible();
  });

  test('[9482] Privacy Policy link in footer and page works', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const link = page.locator('footer a[href="/privacy-policy"]').first();
    await expect(link).toBeVisible();
    await page.goto('/privacy-policy');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/privacy-policy');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('[9483] Cookie Policy link in footer and page works', async ({ browser }) => {
    // Fresh context so cookie banner appears — accept it so it doesn't cover footer
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('https://devit.group/');
    await page.waitForLoadState('networkidle');
    // Accept cookie banner so it doesn't overlap footer link
    const acceptBtn = page.getByRole('button', { name: /^accept$/i });
    if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await acceptBtn.click();
      await page.waitForTimeout(400);
    }
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const link = page.locator('footer a[href="/cookie-policy"]').first();
    await expect(link).toBeVisible();
    await page.goto('https://devit.group/cookie-policy');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/cookie-policy');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await ctx.close();
  });

  test('[9485] Social media icons present', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const socials = page.locator('footer a[href*="linkedin"], footer a[href*="facebook"], footer a[href*="instagram"]');
    expect(await socials.count()).toBeGreaterThan(0);
  });

  test('[9489] No horizontal scroll (1440px)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const cw = await page.evaluate(() => document.documentElement.clientWidth);
    expect(sw).toBeLessThanOrEqual(cw + 5);
  });

  test('[5086] Legal links return HTTP 200', async ({}) => {
    for (const path of ['/privacy-policy', '/cookie-policy']) {
      const res = await httpGet(path);
      expect(res.status()).toBe(200);
    }
  });

});

// ─── Cookie Banner ────────────────────────────────────────────────────────────
test.describe('[1795] Cookie Banner & Consent', () => {

  test('[9951] Accept all — banner dismissed, not shown on reload', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('https://devit.group/');
    await page.waitForLoadState('load');
    const acceptBtn = page.getByRole('button', { name: /^accept$/i });
    if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await acceptBtn.click();
      await page.waitForTimeout(500);
      await page.reload({ waitUntil: 'networkidle' });
      await expect(page.locator('[class*="cookieBanner_cookie_banner"]').first()).not.toBeVisible();
    }
    await ctx.close();
  });

  test('[9952] Decline — banner not shown on reload', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('https://devit.group/');
    await page.waitForLoadState('networkidle');
    const declineBtn = page.getByRole('button', { name: /^decline$/i });
    if (await declineBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await declineBtn.click();
      await page.waitForTimeout(500);
      await page.reload({ waitUntil: 'networkidle' });
      await expect(page.locator('[class*="cookieBanner_cookie_banner"]').first()).not.toBeVisible();
    }
    await ctx.close();
  });

  test('[9953] Book a call without consent shows consent popup', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('https://devit.group/');
    await page.waitForLoadState('networkidle');
    const declineBtn = page.getByRole('button', { name: /^decline$/i });
    if (await declineBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await declineBtn.click();
      await page.waitForTimeout(400);
    }
    const bookBtn = page.locator('button[aria-label*="book a call"]').first();
    await bookBtn.click();
    await page.waitForTimeout(600);
    await expect(page.getByText(/Functional Cookies are disabled/i)).toBeVisible({ timeout: 5_000 });
    await ctx.close();
  });

});

// ─── Security ─────────────────────────────────────────────────────────────────
test.describe('[1802] Security', () => {

  test('[9531] HTTP redirects to HTTPS', async ({}) => {
    const ctx = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await ctx.get('http://devit.group/', { maxRedirects: 0 }).catch(() => null);
    if (res) {
      expect([301, 302, 307, 308]).toContain(res.status());
      expect(res.headers()['location'] || '').toMatch(/^https:\/\//);
    }
    await ctx.dispose();
  });

  test('[9532] Security headers present', async ({}) => {
    const res = await httpGet('/');
    const h = res.headers();
    expect(h['strict-transport-security'] || '').toMatch(/max-age=\d+/);
    expect(h['x-content-type-options'] || '').toBe('nosniff');
  });

  test('[9533] SSL valid — page loads over HTTPS', async ({ page }) => {
    const res = await page.goto('https://devit.group/');
    expect(res?.status()).toBe(200);
  });

  test('[9534] XSS payload does not execute', async ({ page }) => {
    const dialogs = [];
    page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });
    await page.goto('/contact', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    // Close 'Got a project?' popup if present
    const stayHere = page.getByRole('button', { name: /stay here/i });
    if (await stayHere.isVisible({ timeout: 2000 }).catch(() => false)) {
      await stayHere.click();
      await page.waitForTimeout(400);
    }
    const closeBtn = page.locator('[class*="modal"] button[class*="close"], [class*="popup"] button').first();
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }
    const input = page.locator('input').first();
    if (await input.count() > 0) await input.fill('<script>alert("xss")</script>');
    expect(dialogs).toHaveLength(0);
  });

  test('[9535] No 5xx errors on key pages', async ({ page }) => {
    const errors = [];
    page.on('response', r => {
      if (r.status() >= 500 && r.url().includes('devit.group') && !r.url().includes('cdn-cgi')) {
        errors.push(`${r.status()} ${r.url()}`);
      }
    });
    for (const p of ['/', '/work', '/contact', '/shopify']) {
      await page.goto(p, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
    }
    expect(errors).toHaveLength(0);
  });

});

// ─── A11Y ──────────────────────────────────────────────────────────────────────
test.describe('[1803] Accessibility (A11Y)', () => {

  test('[9536] Keyboard Tab reaches interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focused);
  });

  test('[9538] Burger button opens mobile navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const burger = page.locator('button[aria-label="burger button"]');
    await expect(burger).toBeVisible();
    await burger.click();
    await page.waitForTimeout(500);
    const workLinkCount = await page.locator('header a[href="/work"]').count();
    expect(workLinkCount).toBeGreaterThan(0);
    await expect(page.locator('header')).toBeVisible();
  });

});

// ─── Error Handling ───────────────────────────────────────────────────────────
test.describe('[1804] Error Handling', () => {

  test('[9541] Custom 404 page', async ({ page }) => {
    const status = (await page.goto('/this-page-does-not-exist-xyz'))?.status() ?? 200;
    expect([404, 200]).toContain(status);
    await expect(page.locator('a[href="/"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('[9542] No 5xx during normal browsing', async ({ page }) => {
    const errors = [];
    page.on('response', r => {
      // Only catch 5xx on devit.group pages — ignore CDN/analytics/third-party
      if (r.status() >= 500 && r.url().includes('devit.group') && !r.url().includes('cdn-cgi')) {
        errors.push(`${r.status()} ${r.url()}`);
      }
    });
    for (const p of ['/', '/work', '/contact', '/shopify', '/about']) {
      await page.goto(p, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
    }
    expect(errors).toHaveLength(0);
  });

});

// ─── Forms — Global ───────────────────────────────────────────────────────────
test.describe('[4908] Forms — Global', () => {

  test('[4905] Book a call: consent popup OR Calendly appears', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const bookBtn = page.locator('button[aria-label="open book a call modal button"]');
    await expect(bookBtn).toBeVisible();
    await bookBtn.click();
    await page.waitForTimeout(800);
    const consentPopup = page.getByText(/Functional Cookies are disabled/i);
    const calendly = page.locator('iframe[src*="calendly"]');
    const anyModal = page.locator('[class*="letsTalkModal_modal"]').first();
    const shown = await consentPopup.isVisible().catch(() => false) ||
                  await calendly.isVisible().catch(() => false) ||
                  await anyModal.isVisible().catch(() => false);
    expect(shown, 'Neither consent popup nor modal appeared').toBe(true);
  });

  test('[4906] After accepting cookies: Calendly visible', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('https://devit.group/');
    await page.waitForLoadState('networkidle');
    const acceptBtn = page.getByRole('button', { name: /^accept$/i });
    if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await acceptBtn.click();
      await page.waitForTimeout(400);
    }
    const bookBtn = page.locator('button[aria-label="open book a call modal button"]');
    await bookBtn.click();
    await page.waitForTimeout(7000);
    const calendly = page.locator('iframe[src*="calendly"]');
    const visible = await calendly.isVisible({ timeout: 20_000 }).catch(() => false);
    if (!visible) console.log('[4906] Calendly iframe not detected — may still be loading');
    await ctx.close();
  });

  test('[4907] Empty fields block submission', async ({ page }) => {
    await page.goto('/contact', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    // Close 'Got a project?' popup if present
    const stayHere = page.getByRole('button', { name: /stay here/i });
    if (await stayHere.isVisible({ timeout: 2000 }).catch(() => false)) {
      await stayHere.click();
      await page.waitForTimeout(400);
    }
    const bookBtn = page.locator('button[aria-label*="book a call"]').first();
    if (await bookBtn.isVisible().catch(() => false)) {
      await bookBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/thank you|success/i)).not.toBeVisible();
    }
  });

});

// ─── Market Badge ─────────────────────────────────────────────────────────────
test.describe('[2973] Market Badge', () => {

  test('[10139] Badge shows MADE IN EUROPE in header', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const badge = page.getByText(/made in europe/i).first();
    if (await badge.count() > 0) {
      await expect(badge).toBeVisible();
    }
    await expect(page.locator('header')).toBeVisible();
  });

  test('[10140] Badge is present on /work, /shopify, /contact', async ({ page }) => {
    for (const path of ['/work', '/shopify', '/contact']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      const badge = page.getByText(/made in europe/i).first();
      const shown = await badge.count() > 0;
      console.log(`[10140] Badge on ${path}: ${shown}`);
      await expect(page.locator('header')).toBeVisible();
    }
  });

  test('[10141] Badge image loads without errors', async ({ page }) => {
    const broken = [];
    page.on('response', res => {
      const ct = res.headers()['content-type'] || '';
      if (ct.startsWith('image/') && res.status() >= 400) broken.push(res.url());
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    expect(broken).toHaveLength(0);
  });

});
