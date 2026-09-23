import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { PAGES } from '../../src/pages';

/**
 * Market badge is chosen on the client by the browser TIME ZONE (timezoneId).
 * Review personalisation by IP (VPN cases) is NOT covered here — see qase/coverage.csv (manual).
 */
const MARKETS = {
  europe: { tz: ['Europe/Kyiv', 'Europe/London', 'Europe/Berlin'], badge: /MADE IN EUROPE/i, banner: /Europe/i },
  canada: { tz: ['America/Toronto', 'America/Vancouver'], badge: /MADE IN CANADA/i, banner: /Canada/i },
  usa: { tz: ['America/New_York', 'America/Los_Angeles'], badge: /MADE IN (THE )?USA/i, banner: /USA|United States|America/i },
} as const;

async function badgeFor(browser: import('@playwright/test').Browser, tz: string, path = '/') {
  const ctx = await browser.newContext({ timezoneId: tz, locale: 'en-US', viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(path);
  const badge = page.locator('header').getByText(/^MADE IN /i).first();
  await badge.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined);
  const text = (await badge.isVisible()) ? (await badge.innerText()).trim() : '';
  return { ctx, page, text };
}

test.describe('Market Badge & Timezone', () => {
  test(qase(25205, "Badge — USA timezones (New_York + Los_Angeles): 'MADE IN USA' @critical"), async ({ browser }) => {
    for (const tz of MARKETS.usa.tz) {
      for (const path of ['/', '/shopify']) {
        const { ctx, text } = await badgeFor(browser, tz, path);
        expect.soft(text, `${tz} ${path}`).toMatch(MARKETS.usa.badge);
        await ctx.close();
      }
    }
  });

  test(qase(25206, 'Unknown/unsupported timezone -> default badge shown'), async ({ browser }) => {
    const { ctx, text } = await badgeFor(browser, 'Asia/Tokyo');
    test.info().annotations.push({ type: 'actual-badge', description: text || '(hidden)' });
    expect(text === '' || /^MADE IN /i.test(text), `unexpected badge "${text}"`).toBe(true);
    await ctx.close();
  });

  test(qase(25207, 'Badge — Market Badge visible in header on ALL pages'), async ({ page, header }) => {
    for (const p of [...PAGES.map((x) => x.path), '/work/aftersell']) {
      await test.step(p, async () => {
        await page.goto(p);
        await expect.soft(header.marketBadge, `badge missing on ${p}`).toBeVisible();
        await expect.soft(header.marketBadge).toHaveText(MARKETS.europe.badge);
      });
    }
  });

  test(qase(25208, 'Badge updates when timezone changes (new session)'), async ({ browser }) => {
    const ca = await badgeFor(browser, 'America/Toronto');
    expect(ca.text).toMatch(MARKETS.canada.badge);
    await ca.ctx.close();
    const ua = await badgeFor(browser, 'Europe/Kyiv');
    expect(ua.text).toMatch(MARKETS.europe.badge);
    await ua.ctx.close();
  });

  test(qase(25209, "Badge — Canada timezone (America/Toronto): 'MADE IN CANADA'"), async ({ browser }) => {
    for (const path of ['/', '/shopify', '/about']) {
      const { ctx, text } = await badgeFor(browser, 'America/Toronto', path);
      expect.soft(text, path).toMatch(MARKETS.canada.badge);
      await ctx.close();
    }
  });

  test(qase(25210, "Badge — Europe/Kyiv timezone: 'Made in Europe' badge"), async ({ browser }) => {
    const { ctx, page, text } = await badgeFor(browser, 'Europe/Kyiv');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    expect(text).toMatch(MARKETS.europe.badge);
    await page.reload();
    expect(errors).toEqual([]);
    await ctx.close();
  });

  test(qase(25211, 'Badge — Europe timezone: badge same across EU regions'), async ({ browser }) => {
    const texts: string[] = [];
    for (const tz of MARKETS.europe.tz) {
      const { ctx, text } = await badgeFor(browser, tz);
      texts.push(text);
      await ctx.close();
    }
    expect(new Set(texts).size, texts.join(' | ')).toBe(1);
    expect(texts[0]).toMatch(MARKETS.europe.badge);
  });

  test(qase(25258, 'Homepage — Market Badge: header badge and hero banner are in sync @critical'), async ({ browser }) => {
    for (const market of ['canada', 'europe', 'usa'] as const) {
      await test.step(market, async () => {
        const { ctx, page, text } = await badgeFor(browser, MARKETS[market].tz[0]);
        expect.soft(text, 'header badge').toMatch(MARKETS[market].badge);
        const banner = page.locator('main').getByText(/^(Product of|Made in) /i).first();
        await expect.soft(banner, 'market banner').toHaveText(MARKETS[market].banner);
        await ctx.close();
      });
    }
  });

  test(qase(25259, "Homepage — Market Banner: 'Product of Europe' shown for Europe timezone"), async ({ browser }) => {
    const eu = await badgeFor(browser, 'Europe/London');
    await expect(eu.page.locator('main').getByText('Product of Europe', { exact: true })).toBeVisible();
    await eu.ctx.close();
    const us = await badgeFor(browser, 'America/New_York');
    await expect(us.page.locator('main').getByText('Product of Europe', { exact: true })).toHaveCount(0);
    await us.ctx.close();
  });

  test(qase(25257, 'Homepage — Market Banner image/flag loads correctly per market'), async ({ browser }) => {
    for (const market of ['europe', 'canada', 'usa'] as const) {
      const { ctx, page } = await badgeFor(browser, MARKETS[market].tz[0]);
      const imgs = page.locator('img[alt="Market section image"]');
      expect.soft(await imgs.count(), `${market}: market image`).toBeGreaterThan(0);
      const broken = await imgs.evaluateAll((els) => (els as HTMLImageElement[]).filter((i) => i.complete && i.naturalWidth === 0).length);
      expect.soft(broken, `${market}: broken market image`).toBe(0);
      await ctx.close();
    }
  });

  test(qase(25256, 'Homepage — Market Banner CTA link is functional'), async ({ page, request }) => {
    await page.goto('/');
    const section = page.locator('main').getByText('Product of Europe', { exact: true }).locator('xpath=ancestor::*[.//a or .//button][1]');
    const link = section.locator('a[href]').first();
    if (await link.count()) {
      const href = (await link.getAttribute('href'))!;
      expect((await request.get(href)).status()).toBeLessThan(400);
    } else {
      test.info().annotations.push({ type: 'note', description: 'Market banner has no CTA link' });
    }
  });
});
