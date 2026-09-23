import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { PAGES } from '../../src/pages';
import { expectNoHorizontalScroll, trackFailedRequests } from '../../src/helpers';

test(qase(25146, 'Smoke — visual layout intact on all key pages (no broken CSS) @critical @smoke'), async ({ page, header, footer }) => {
  const failed = trackFailedRequests(page);
  for (const p of [...PAGES.map((x) => x.path), '/work/aftersell']) {
    await test.step(p, async () => {
      const res = await page.goto(p);
      expect.soft(res?.status(), `${p} status`).toBe(200);
      const styled = await page.evaluate(() => {
        const sheets = document.styleSheets.length;
        const body = getComputedStyle(document.body);
        return { sheets, font: body.fontFamily, margin: body.margin };
      });
      expect.soft(styled.sheets, `${p}: no stylesheets`).toBeGreaterThan(0);
      expect.soft(styled.font, `${p}: default serif font = CSS not applied`).not.toMatch(/^("?Times New Roman"?|serif)$/i);
      await expect.soft(header.logo, `${p}: header`).toBeVisible();
      await expect.soft(footer.root, `${p}: footer`).toBeAttached();
      await expectNoHorizontalScroll(page);
    });
  }
  expect.soft(failed.filter((f) => /stylesheet|script/.test(f)), 'failed CSS/JS chunks').toEqual([]);
  await test.step('footer columns in grid', async () => {
    await page.goto('/');
    const tops = await Promise.all(['Expertises', 'Company', 'Industries', 'Contacts'].map(async (h) => (await footer.heading(h).boundingBox())?.y ?? -1));
    expect(Math.max(...tops) - Math.min(...tops), `footer column headings not on one row: ${tops.join(',')}`).toBeLessThan(40);
  });
});
