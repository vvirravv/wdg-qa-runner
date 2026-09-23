import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { PAGES, VIEWPORTS } from '../../src/pages';
import { brokenImages, expectNoHorizontalScroll, scrollThrough } from '../../src/helpers';

/**
 * Qase: "Responsiveness — <Page>: display and main functionality at 375 / 768 / 1440".
 * Automated part: layout (no h-scroll, images, heading), navigation entry point per breakpoint,
 * tap-target size of visible buttons on mobile. Visual comparison with Figma stays manual.
 */
for (const p of PAGES.filter((x) => x.qase.responsive)) {
  test(qase(p.qase.responsive!, `Responsiveness — ${p.name}: 375px / 768px / 1440px`), async ({ page, header, mobileMenu }) => {
    for (const [name, vp] of Object.entries(VIEWPORTS)) {
      await test.step(qase.step(`${name} ${vp.width}px`, 'No horizontal scroll, images load, heading visible, navigation reachable'), async () => {
        await page.setViewportSize(vp);
        await page.goto(p.path);
        await scrollThrough(page);
        await expectNoHorizontalScroll(page);
        expect.soft(await brokenImages(page), `${name}: broken images`).toEqual([]);
        await expect.soft(page.locator('main h1, main h2').first()).toBeVisible();
        if (vp.width < 1024) {
          await expect.soft(mobileMenu.burger, `${name}: burger visible`).toBeVisible();
        } else {
          await expect.soft(header.work, `${name}: desktop nav visible`).toBeVisible();
        }
        if (name === 'mobile') {
          const small = await page.locator('main button:visible, main a[role="button"]:visible').evaluateAll((els) =>
            els.map((e) => ({ t: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30), r: e.getBoundingClientRect() }))
              .filter((x) => x.r.width > 0 && (x.r.width < 44 || x.r.height < 44) && x.t)
              .map((x) => `${x.t} ${Math.round(x.r.width)}x${Math.round(x.r.height)}`));
          expect.soft(small, 'mobile tap targets < 44x44 px').toEqual([]);
        }
      });
    }
  });
}
