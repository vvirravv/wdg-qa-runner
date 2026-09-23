import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { abs, scrollThrough } from '../../src/helpers';

async function expect404Page(page: import('@playwright/test').Page, path: string) {
  const res = await page.goto(path);
  expect(res?.status(), `${path} status`).toBe(404);
  await expect(page.locator('header a[href="/"]').first()).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/does not exist|not found|404/i);
  await expect(page.locator('main a[href="/"]')).toBeVisible();
}

test.describe('Error handling', () => {
  test(qase(25199, 'Error — custom 404 page returns HTTP 404 and has noindex'), async ({ page }) => {
    await expect404Page(page, '/this-page-does-not-exist-xyz-404');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect.soft(ogTitle ?? '', '404 inherits homepage og:title').toMatch(/404|not found/i);
    expect.soft(await page.title(), '404 inherits homepage <title>').toMatch(/404|not found/i);
  });

  test(qase(25200, 'Error — no 5xx server errors during normal browsing'), async ({ page }) => {
    const errors: string[] = [];
    page.on('response', (r) => { if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`); });
    for (const path of ['/', '/work', '/contact', '/shopify', '/work/real-americas-voice', '/work/aftersell']) {
      await page.goto(path);
      await scrollThrough(page, 1000, 100);
    }
    expect(errors).toEqual([]);
  });

  test(qase(25201, '404 — non-existent project slug returns HTTP 404'), async ({ page }) => {
    await expect404Page(page, '/work/nonexistent-slug-xyz-404');
  });

  test(qase(25202, '404 — non-existent blog article slug returns HTTP 404'), async ({ page }) => {
    await expect404Page(page, '/blog/nonexistent-slug-xyz-404');
  });

  test(qase(25203, 'Redirect — trailing slash normalisation (no redirect loop)'), async ({ request, page }) => {
    const rules: string[] = [];
    for (const path of ['/work/', '/about/', '/blog/', '/contact/', '/shopify/']) {
      await test.step(path, async () => {
        const first = await request.get(path, { maxRedirects: 0 });
        const status = first.status();
        expect([200, 301, 308], `${path} -> ${status}`).toContain(status);
        if (status !== 200) {
          const loc = first.headers()['location'];
          const second = await request.get(loc, { maxRedirects: 0 });
          expect(second.status(), `${path} -> ${loc} must be final 200 (max one hop)`).toBe(200);
          rules.push('drop');
        } else rules.push('keep');
      });
    }
    expect(new Set(rules).size, `inconsistent trailing-slash rule: ${rules.join(',')}`).toBe(1);
    const direct = await request.get('/work', { maxRedirects: 0 });
    expect(direct.status()).toBe(200);
    await page.goto('/work/');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', abs('/work'));
  });

  test(qase(25204, 'Offline indicator — offline/online toasts'), async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    for (let i = 0; i < 2; i++) {
      await context.setOffline(true);
      await expect(page.getByText(/Internet connection (broken|lost)/i).first()).toBeVisible();
      await context.setOffline(false);
      await expect(page.getByText(/Internet connection restored/i).first()).toBeVisible();
      await expect(page.getByText(/Internet connection restored/i)).toHaveCount(1);
      const color = await page.getByText(/Internet connection restored/i).first().evaluate((e) => {
        let el: Element | null = e; let bg = '';
        while (el && (!bg || bg === 'rgba(0, 0, 0, 0)')) { bg = getComputedStyle(el).backgroundColor; el = el.parentElement; }
        return `${getComputedStyle(e).color} ${bg}`;
      });
      test.info().annotations.push({ type: 'restored-toast-colors', description: color });
      await expect(page.getByText(/Internet connection restored/i)).toBeHidden({ timeout: 15_000 });
    }
  });
});
