import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { PAGES } from '../../src/pages';
import { serverHtml } from '../../src/helpers';

/**
 * Qase: "SSR — <Page> first section renders without JavaScript (Next.js SSR check)".
 * Two layers: (1) raw server HTML via request, (2) browser with JavaScript disabled.
 */
test.describe('SSR without JavaScript', () => {
  test.use({ javaScriptEnabled: false, consent: 'none', autoCloseRoutingModal: false });

  for (const p of PAGES.filter((x) => x.qase.ssr)) {
    test(qase(p.qase.ssr!, `SSR — ${p.name} first section renders without JavaScript`), async ({ page, request, header }) => {
      await test.step(qase.step('GET raw HTML', 'HTTP 200, > 5 KB, contains first-section text'), async () => {
        const { status, html } = await serverHtml(request, p.path);
        expect(status).toBe(200);
        expect(html.length).toBeGreaterThan(5_000);
        expect(html).toMatch(p.ssrText);
      });
      await test.step(qase.step('Open page with JS disabled', 'Not blank, header/navigation HTML and main heading visible'), async () => {
        const res = await page.goto(p.path);
        expect(res?.status()).toBe(200);
        await expect(header.logo).toBeVisible();
        await expect(page.locator('main')).toContainText(p.ssrText);
        const textLen = (await page.locator('body').innerText()).trim().length;
        expect(textLen, 'page looks blank without JS').toBeGreaterThan(200);
      });
    });
  }

  test(qase(25521, 'ReSell — SSR: GET /resell returns HTML with pricing and hero content'), async ({ request }) => {
    const { status, html } = await serverHtml(request, '/resell');
    expect(status).toBe(200);
    expect(html.length).toBeGreaterThan(5_000);
    expect(html).toMatch(/ReSell/);
    expect(html).toMatch(/Subscription Plans|pricing|\$\d+/i);
  });
});
