import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { PAGES } from '../../src/pages';
import { brokenImages, expectNoHorizontalScroll, ownErrors, placeholderTokens, scrollThrough, trackFailedRequests } from '../../src/helpers';

/**
 * Qase: "<Page> — page loads with HTTP 200, layout intact, no JS errors" (16 critical cases)
 * + "Blog — article page loads with correct content".
 */
test.describe('Page health @critical', () => {
  for (const p of PAGES.filter((x) => x.qase.load)) {
    test(qase(p.qase.load!, `${p.name} — page loads with HTTP 200, layout intact, no JS errors @smoke`), async ({ page, jsErrors, header, footer }) => {
      const failed = trackFailedRequests(page);

      const response = await test.step(qase.step('Open page', 'Document request returns HTTP 200, max 1 redirect hop'), async () => {
        const res = await page.goto(p.path, { waitUntil: 'domcontentloaded' });
        expect(res, 'no response').not.toBeNull();
        expect(res!.status()).toBe(200);
        let hops = 0; let r = res!.request().redirectedFrom();
        while (r) { hops++; r = r.redirectedFrom(); }
        expect(hops, 'redirect chain length').toBeLessThanOrEqual(1);
        return res!;
      });
      expect(response.ok()).toBeTruthy();

      await test.step(qase.step('Layout intact', 'Header, main content and footer are rendered'), async () => {
        await expect(header.root).toBeVisible();
        await expect(page.locator('main')).toBeVisible();
        await expect(footer.root).toBeAttached();
      });

      await test.step(qase.step('Scroll whole page', 'All images load, no empty/placeholder content'), async () => {
        await page.waitForLoadState('load');
        await scrollThrough(page);
        expect.soft(await brokenImages(page), 'broken images').toEqual([]);
        expect.soft(await placeholderTokens(page), 'placeholder tokens (lorem/undefined/NaN/{{}})').toEqual([]);
      });

      await test.step(qase.step('No horizontal scroll', 'Content fits viewport width'), async () => {
        await expectNoHorizontalScroll(page);
      });

      await test.step(qase.step('Console & Network', 'No own JS errors, no 4xx/5xx for own CSS/JS/fonts/images'), async () => {
        expect.soft(ownErrors(jsErrors), 'JS errors from site code').toEqual([]);
        expect.soft(failed, 'failed first-party requests').toEqual([]);
      });
    });
  }
});
