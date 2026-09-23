import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { PAGES } from '../../src/pages';
import { expectNoHorizontalScroll, ownErrors } from '../../src/helpers';

/**
 * Qase: "<Page> — Cross-browser: renders and functions correctly in Chrome, Firefox, Safari".
 * Runs in chromium + firefox + webkit projects (tag @cross-browser). Opera is Chromium — not run separately.
 */
for (const p of PAGES.filter((x) => x.qase.crossBrowser)) {
  test(qase(p.qase.crossBrowser!, `${p.name} — Cross-browser renders and works @cross-browser`), async ({ page, jsErrors, header, footer, browserName }) => {
    const res = await page.goto(p.path);
    expect(res?.status()).toBe(200);
    await expect(header.root).toBeVisible();
    await expect(page.locator('main h1, main h2').first()).toBeVisible();
    await expect(footer.root).toBeAttached();
    await expectNoHorizontalScroll(page);
    await test.step('header navigation works', async () => {
      await header.work.click();
      await expect(page).toHaveURL(/\/work$/);
    });
    expect.soft(ownErrors(jsErrors), `${browserName}: JS errors`).toEqual([]);
  });
}
