// @ts-check
const { request } = require('@playwright/test');

const BASE = 'https://devit.group';

/** Plain HTTP GET without browser */
async function httpGet(path) {
  const ctx = await request.newContext();
  const res = await ctx.get(`${BASE}${path}`);
  const status = res.status();
  const body = await res.text().catch(() => '');
  await ctx.dispose();
  return { status: () => status, text: () => Promise.resolve(body) };
}

/** Listen for JS errors while fn() runs, return filtered list */
async function collectJsErrors(page, fn) {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  await fn();
  return errors.filter(e =>
    !e.includes('chrome-extension') &&
    !e.includes('extension://') &&
    !e.includes('favicon') &&
    // CDN prefetch/preload hints — not real errors, status 0 in headless
    !e.includes('cdn.devit.group') &&
    !e.includes('cdn-cgi/imagedelivery') &&
    // Cloudflare RUM / analytics — not product errors
    !e.includes('cdn-cgi/rum') &&
    !e.includes('static.cloudflareinsights') &&
    // Generic "Failed to load resource" from preload hints
    !(e.includes('Failed to load resource') && e.includes('net::ERR_')) &&
    !e.includes('net::ERR_FAILED') &&
    !e.includes('net::ERR_ABORTED')
  );
}

/** Start collecting broken image URLs — call BEFORE navigation */
function watchBrokenImages(page) {
  const broken = [];
  page.on('response', res => {
    const ct = res.headers()['content-type'] || '';
    if (ct.startsWith('image/') && res.status() >= 400) {
      // Ignore Cloudflare CDN prefetch hints — they return non-200 in headless but are not real broken images
      const url = res.url();
      if (!url.includes('cdn-cgi/imagedelivery') && !url.includes('cdn-cgi/rum')) {
        broken.push(url);
      }
    }
  });
  return broken;
}

/** Dismiss cookie banner if present — call at start of tests that click footer/page links */
async function dismissCookieBanner(page) {
  try {
    const declineBtn = page.getByRole('button', { name: /decline|reject|deny/i }).first();
    const acceptBtn  = page.getByRole('button', { name: /accept all|accept/i }).first();
    const banner = page.locator('[class*="cookieBanner"], [class*="cookie_banner"], [class*="consent"]').first();
    if (await banner.isVisible({ timeout: 3000 }).catch(() => false)) {
      if (await declineBtn.isVisible().catch(() => false)) {
        await declineBtn.click();
      } else if (await acceptBtn.isVisible().catch(() => false)) {
        await acceptBtn.click();
      }
      await page.waitForTimeout(500);
    }
  } catch {}
}

module.exports = { httpGet, collectJsErrors, watchBrokenImages, dismissCookieBanner, BASE };
