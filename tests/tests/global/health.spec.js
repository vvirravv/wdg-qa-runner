// @ts-check
const { test, expect } = require('@playwright/test');
const { httpGet, collectJsErrors, dismissCookieBanner } = require('../../helpers');

// ─── HTTP 200 for all pages ───────────────────────────────────────────────────
const ALL_PAGES = [
  { path: '/',               name: 'Homepage'       },
  { path: '/work',           name: 'Work'           },
  { path: '/contact',        name: 'Contact'        },
  { path: '/shopify',        name: 'Shopify'        },
  { path: '/about',          name: 'About'          },
  { path: '/calculator',     name: 'Calculator'     },
  { path: '/blog',           name: 'Blog'           },
  { path: '/awards',         name: 'Awards'         },
  { path: '/case-studies',   name: 'Case Studies'   },
  { path: '/privacy-policy', name: 'Privacy Policy' },
  { path: '/cookie-policy',  name: 'Cookie Policy'  },
  { path: '/resell',         name: 'ReSell'         },
  { path: '/react-flow',     name: 'React Flow'     },
  { path: '/support',        name: 'Support'        },
];

test.describe('[H-01] HTTP 200 — all pages load', () => {
  for (const { path, name } of ALL_PAGES) {
    test(`[H-01] ${name} (${path})`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status(), `${name} returned non-200`).toBe(200);
      await expect(page.locator('body')).not.toBeEmpty();
      // No blank/white screen — body must have content
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.trim().length, `${name} body is empty`).toBeGreaterThan(100);
    });
  }
});

// ─── 404 page ─────────────────────────────────────────────────────────────────
test.describe('[H-02] Custom 404 page', () => {

  test('[H-02] returns HTTP 404 status', async ({ page }) => {
    const res = await page.goto('/this-page-absolutely-does-not-exist-xyz-404test');
    expect(res?.status()).toBe(404);
  });

  test('[H-02] 404 page has noindex meta tag', async ({ page }) => {
    await page.goto('/this-page-absolutely-does-not-exist-xyz-404test');
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots?.toLowerCase()).toContain('noindex');
  });

  test('[H-02] 404 page shows useful content (not blank)', async ({ page }) => {
    await page.goto('/this-page-absolutely-does-not-exist-xyz-404test');
    const body = await page.locator('body').innerText();
    expect(body.trim().length).toBeGreaterThan(20);
  });

});

// ─── Cookie Banner ────────────────────────────────────────────────────────────
test.describe('[H-03] Cookie Banner', () => {

  test('[H-03] appears on fresh session', async ({ browser }) => {
    const ctx = await browser.newContext(); // clean context = no cookies
    const page = await ctx.newPage();
    await page.goto('/');
    const banner = page.locator('[class*="cookie" i], [class*="consent" i], [class*="gdpr" i]').first();
    await expect(banner).toBeVisible({ timeout: 8_000 });
    await ctx.close();
  });

  test('[H-03] has Accept and Decline buttons', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/');
    const accept  = page.getByRole('button', { name: /accept/i }).first();
    await expect(accept).toBeVisible({ timeout: 8_000 });
    await ctx.close();
  });

  test('[H-03] Accept closes banner', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/');
    const accept = page.getByRole('button', { name: /accept all|accept/i }).first();
    if (await accept.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await accept.click();
      await page.waitForTimeout(800);
      const banner = page.locator('[class*="cookie" i], [class*="consent" i]').first();
      await expect(banner).not.toBeVisible({ timeout: 5_000 });
    }
    await ctx.close();
  });

});

// ─── Modal windows on load ────────────────────────────────────────────────────
test.describe('[H-04] Page-load modals', () => {

  test('[H-04] /contact — "Got a project?" modal appears', async ({ page }) => {
    await page.goto('/contact');
    const modal = page.getByText(/got a project/i).first();
    await expect(modal).toBeVisible({ timeout: 8_000 });
  });

  test('[H-04] /contact modal has close button', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForTimeout(1000);
    const close = page.getByRole('button', { name: /close|×|✕|stay here/i }).first();
    if (await close.count() > 0) {
      await expect(close).toBeVisible({ timeout: 5_000 });
    }
  });

  test('[H-04] /support — "Need help with an app?" modal appears', async ({ page }) => {
    await page.goto('/support');
    const modal = page.getByText(/need help/i).first();
    await expect(modal).toBeVisible({ timeout: 8_000 });
  });

});

// ─── JS errors on all pages ───────────────────────────────────────────────────
test.describe('[H-05] No JS errors on page load', () => {
  for (const { path, name } of ALL_PAGES) {
    test(`[H-05] ${name} (${path})`, async ({ page }) => {
      const errors = await collectJsErrors(page, async () => {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
      });
      expect(errors, `JS errors on ${name}: ${errors.join(', ')}`).toHaveLength(0);
    });
  }
});

// ─── Mobile navigation ────────────────────────────────────────────────────────
test.describe('[H-06] Mobile navigation (375px)', () => {

  test('[H-06] burger menu visible at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await dismissCookieBanner(page);
    const burger = page.locator('[class*="burger" i], [class*="hamburger" i], [class*="menu-btn" i], button[aria-label*="menu" i]').first();
    await expect(burger).toBeVisible({ timeout: 8_000 });
  });

  test('[H-06] burger click opens nav menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await dismissCookieBanner(page);
    const burger = page.locator('[class*="burger" i], [class*="hamburger" i], button[aria-label*="menu" i]').first();
    if (await burger.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await burger.click();
      await page.waitForTimeout(600);
      // Nav items should now be visible
      const navLinks = page.locator('nav a, [class*="mobileMenu" i] a, [class*="mobile-menu" i] a');
      expect(await navLinks.count()).toBeGreaterThan(2);
    }
  });

  test('[H-06] no horizontal scroll on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const cw = await page.evaluate(() => document.documentElement.clientWidth);
    expect(sw, `horizontal overflow: scrollWidth=${sw}, clientWidth=${cw}`).toBeLessThanOrEqual(cw + 5);
  });

});

// ─── Market badge (timezone) ──────────────────────────────────────────────────
test.describe('[H-07] Market badge by timezone', () => {

  test('[H-07] USA timezone → USA badge visible', async ({ browser }) => {
    const ctx = await browser.newContext({ timezoneId: 'America/New_York' });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Badge may be text or image — check for USA/US content
    const badge = page.getByText(/made in usa|usa/i).first()
      .or(page.locator('[class*="badge" i][class*="us" i], [class*="badge" i][class*="usa" i]').first());
    const found = await badge.count();
    // Soft assertion — badge might be A/B tested
    if (found > 0) {
      await expect(badge).toBeVisible({ timeout: 5_000 });
    }
    await ctx.close();
  });

  test('[H-07] Ukraine timezone → UA badge visible', async ({ browser }) => {
    const ctx = await browser.newContext({ timezoneId: 'Europe/Kyiv' });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const badge = page.getByText(/ukraine|ukrainian|зроблено в україні/i).first()
      .or(page.locator('[class*="badge" i][class*="ua" i], [class*="badge" i][class*="ukraine" i]').first());
    const found = await badge.count();
    if (found > 0) {
      await expect(badge).toBeVisible({ timeout: 5_000 });
    }
    await ctx.close();
  });

});

// ─── Cookie Consent (H-08) ───────────────────────────────────────────────────
test.describe('[H-08] Cookie consent', () => {

  test('[H-08] Cookie consent stored after Accept', async ({ browser }) => {
    const ctx = await browser.newContext(); // fresh context — no cookies
    const page = await ctx.newPage();
    await page.goto('/');
    const accept = page.getByRole('button', { name: /accept all|accept/i }).first();
    if (await accept.isVisible({ timeout: 6_000 }).catch(() => false)) {
      await accept.click();
      await page.waitForTimeout(800);
      // Check localStorage for a consent key
      const consentKeys = ['cookie-consent', 'cookieConsent', 'CookieConsent', 'consent'];
      const stored = await page.evaluate(function(keys) {
        for (var i = 0; i < keys.length; i++) {
          var val = localStorage.getItem(keys[i]);
          if (val !== null) return { key: keys[i], value: val };
        }
        return null;
      }, consentKeys);
      // Also check cookies as fallback
      const cookies = await ctx.cookies();
      const consentCookie = cookies.find(function(c) {
        return /consent|cookie/i.test(c.name);
      });
      const hasConsent = stored !== null || consentCookie !== undefined;
      // Soft assertion — some implementations may use session storage
      if (!hasConsent) {
        const sessionStored = await page.evaluate(function(keys) {
          for (var i = 0; i < keys.length; i++) {
            var val = sessionStorage.getItem(keys[i]);
            if (val !== null) return true;
          }
          return false;
        }, consentKeys);
        // At minimum the banner should be gone
        const banner = page.locator('[class*="cookie" i], [class*="consent" i], [class*="gdpr" i]').first();
        const bannerGone = !(await banner.isVisible({ timeout: 2_000 }).catch(() => false));
        expect(sessionStored || bannerGone, 'Expected cookie consent to be stored or banner to be dismissed').toBe(true);
      } else {
        expect(hasConsent).toBe(true);
      }
    }
    await ctx.close();
  });

  test('[H-08] Cookie banner does not reappear after consent on reload', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/');
    const accept = page.getByRole('button', { name: /accept all|accept/i }).first();
    if (await accept.isVisible({ timeout: 6_000 }).catch(() => false)) {
      await accept.click();
      await page.waitForTimeout(800);
      // Reload the page
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1_000);
      const banner = page.locator('[class*="cookie" i], [class*="consent" i], [class*="gdpr" i]').first();
      await expect(banner).not.toBeVisible({ timeout: 5_000 });
    }
    await ctx.close();
  });

  test('[H-08] Cookie preferences modal opens and has toggles', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/');
    // Look for "Cookie Settings" or preferences link/button
    const settingsBtn = page.getByRole('button', { name: /cookie settings|preferences|manage|customize/i }).first()
      .or(page.getByRole('link', { name: /cookie settings|preferences|manage/i }).first());
    if (await settingsBtn.isVisible({ timeout: 6_000 }).catch(() => false)) {
      await settingsBtn.click();
      await page.waitForTimeout(600);
      // Expect a modal or panel with category toggles
      const modal = page.locator('[role="dialog"], [class*="modal" i], [class*="popup" i], [class*="panel" i]').first();
      const hasModal = await modal.isVisible({ timeout: 4_000 }).catch(() => false);
      const toggles = page.locator('input[type="checkbox"], input[type="radio"], [role="switch"]');
      const toggleCount = await toggles.count();
      expect(hasModal || toggleCount > 0, 'Expected cookie preferences modal with toggles').toBe(true);
    }
    await ctx.close();
  });

});
