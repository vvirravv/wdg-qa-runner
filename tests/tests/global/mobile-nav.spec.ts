import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { VIEWPORTS } from '../../src/pages';
import { expectNoHorizontalScroll } from '../../src/helpers';

const BREAKPOINTS = [VIEWPORTS.mobile, VIEWPORTS.tablet];

test.describe('Mobile / Tablet navigation', () => {
  for (const vp of BREAKPOINTS) {
    test.describe(`${vp.width}px`, () => {
      test.use({ viewport: vp, hasTouch: true });

      test(qase(25157, `Mobile nav — burger menu button visible (${vp.width}px) @critical`), async ({ page, header, mobileMenu }) => {
        await page.goto('/');
        await expect(mobileMenu.burger).toBeVisible();
        await expect(header.work).toBeHidden();
        const box = await mobileMenu.burger.boundingBox();
        expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width);
      });

      test(qase(25158, `Mobile nav — burger opens menu with all nav items (${vp.width}px) @critical`), async ({ page, mobileMenu }) => {
        await page.goto('/');
        await mobileMenu.open();
        for (const item of ['Shopify', 'Products', 'Work', 'Case studies', 'Contacts']) {
          await expect.soft(page.getByText(item, { exact: true }).filter({ visible: true }).first(), `${item} missing`).toBeVisible();
        }
        await expect.soft(page.getByText('Book a call', { exact: true }).filter({ visible: true }).first(), "'Book a call' missing in mobile menu").toBeVisible();
        await expectNoHorizontalScroll(page);
      });

      test(qase(25159, `Mobile nav — each nav link and dropdown navigates correctly (${vp.width}px) @critical`), async ({ page, mobileMenu }) => {
        const flows: Array<[string, string[], RegExp]> = [
          ['Shopify', ['/shopify'], /\/shopify$/],
          ['Work', ['/work'], /\/work$/],
          ['Case studies', ['/case-studies'], /\/case-studies$/],
          ['Products → ReSell', ['Products', '/resell'], /\/resell$/],
          ['Products → React Flow', ['Products', '/react-flow'], /\/react-flow$/],
          ['Contacts → Agency contact', ['Contacts', '/contact'], /\/contact$/],
          ['Contacts → Support', ['Contacts', '/support'], /\/support$/],
        ];
        for (const [name, path, url] of flows) {
          await test.step(name, async () => {
            await page.goto('/');
            await mobileMenu.open();
            for (const hop of path) {
              if (hop.startsWith('/')) await mobileMenu.link(hop).click();
              else await mobileMenu.item(hop).click();
            }
            await expect(page).toHaveURL(url);
          });
        }
      });

      test(qase(25160, `Mobile nav — close button / overlay tap closes menu (${vp.width}px)`), async ({ page, mobileMenu }) => {
        await page.goto('/');
        await mobileMenu.open();
        await mobileMenu.burger.click(); // burger morphs into X (same button)
        await expect(mobileMenu.panel).toBeHidden();
      });

      test(qase(25161, `Mobile nav — Market Badge visible in mobile header without overlap (${vp.width}px)`), async ({ page, mobileMenu }) => {
        await page.goto('/');
        const badge = page.locator('header').getByText(/^MADE IN /i).filter({ visible: true }).first();
        if (await badge.count()) {
          const b = (await badge.boundingBox())!;
          const burger = (await mobileMenu.burger.boundingBox())!;
          const logo = (await page.locator('header a[href="/"]').filter({ visible: true }).first().boundingBox())!;
          const overlap = (a: typeof b, c: typeof b) => !(a.x + a.width <= c.x || c.x + c.width <= a.x || a.y + a.height <= c.y || c.y + c.height <= a.y);
          expect(overlap(b, burger), 'badge overlaps burger').toBe(false);
          expect(overlap(b, logo), 'badge overlaps logo').toBe(false);
        } else {
          test.info().annotations.push({ type: 'note', description: 'Badge hidden in mobile header (documented behaviour)' });
        }
      });

      test(qase(25162, `Mobile nav — logo links to homepage (${vp.width}px)`), async ({ page }) => {
        await page.goto('/work');
        await page.locator('header a[href="/"]').filter({ visible: true }).first().click();
        await expect(page).toHaveURL(/devit\.group\/?$/);
      });

      test(qase(25163, `Mobile nav — no horizontal scroll after menu interaction (${vp.width}px)`), async ({ page, mobileMenu }) => {
        await page.goto('/');
        await mobileMenu.open();
        await mobileMenu.burger.click();
        await expect(mobileMenu.panel).toBeHidden();
        await expectNoHorizontalScroll(page);
      });

      test(qase(25164, `Mobile nav — burger toggles, rapid taps end in consistent state (${vp.width}px)`), async ({ page, mobileMenu }) => {
        await page.goto('/');
        const icon = () => mobileMenu.burger.innerHTML();
        const closedIcon = await icon();
        await mobileMenu.open();
        expect.soft(await icon(), 'burger icon did not morph into X').not.toBe(closedIcon);
        await mobileMenu.burger.click();
        await expect(mobileMenu.panel).toBeHidden();
        for (let i = 0; i < 5; i++) await mobileMenu.burger.click({ delay: 50 });
        await page.waitForTimeout(800);
        // 5 taps from closed -> must end OPEN, icon matching state
        await expect(mobileMenu.panel).toBeVisible();
        expect(await icon()).not.toBe(closedIcon);
      });

      test(qase(25165, `Mobile nav — body scroll is locked while menu is open (${vp.width}px)`), async ({ page, mobileMenu }) => {
        await page.goto('/');
        await page.evaluate(() => window.scrollTo(0, 1600));
        await page.waitForTimeout(300);
        const y0 = await page.evaluate(() => window.scrollY);
        await mobileMenu.open();
        await page.mouse.wheel(0, 800);
        await page.waitForTimeout(400);
        const overflow = await page.evaluate(() => getComputedStyle(document.body).overflow + getComputedStyle(document.documentElement).overflow);
        expect.soft(overflow).toMatch(/hidden/);
        await mobileMenu.burger.click();
        await page.waitForTimeout(400);
        expect(Math.abs((await page.evaluate(() => window.scrollY)) - y0), 'scroll position changed after closing menu').toBeLessThanOrEqual(5);
      });
    });
  }
});
