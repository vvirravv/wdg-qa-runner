import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { PAGES, VIEWPORTS } from '../../src/pages';
import { scrollThrough } from '../../src/helpers';

/**
 * Qase: "Design Compliance — <Page> matches Figma design" — PARTIAL automation:
 * the step "no unexpected visual regressions vs approved baseline" is covered with screenshot baselines.
 * First run: `npm run test:visual:update` on an approved build, then commit the snapshots.
 * Figma pixel comparison itself stays manual.
 */
for (const p of PAGES.filter((x) => x.qase.design)) {
  test(qase(p.qase.design!, `Design Compliance — ${p.name} visual baseline @visual`), async ({ page }) => {
    for (const vpName of ['desktop', 'mobile'] as const) {
      await test.step(`${vpName} baseline`, async () => {
        await page.setViewportSize(VIEWPORTS[vpName]);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(p.path);
        await scrollThrough(page);
        await expect(page).toHaveScreenshot(`${p.key}-${vpName}.png`, {
          fullPage: true,
          animations: 'disabled',
          maxDiffPixelRatio: 0.02,
          mask: [page.locator('video'), page.locator('iframe'), page.locator('[class*="slider"], [class*="carousel"], [class*="swiper"]')],
          timeout: 30_000,
        });
      });
    }
  });
}
