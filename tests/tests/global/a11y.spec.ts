import AxeBuilder from '@axe-core/playwright';
import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { expectNoHorizontalScroll } from '../../src/helpers';

const KEY_PAGES = ['/', '/work', '/contact', '/shopify'];

test.describe('Accessibility (A11Y)', () => {
  test(qase(25192, 'A11Y — keyboard navigation via Tab reaches interactive elements'), async ({ page }) => {
    await page.goto('/');
    const visited = new Set<string>();
    let stuck = 0; let last = '';
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const id = await page.evaluate(() => {
        const e = document.activeElement as HTMLElement | null;
        if (!e || e === document.body) return 'BODY';
        return `${e.tagName}|${e.getAttribute('href') ?? ''}|${(e.textContent ?? '').trim().slice(0, 20)}|${e.getAttribute('aria-label') ?? ''}`;
      });
      if (id === last) stuck++; last = id; visited.add(id);
    }
    expect(stuck, 'focus trap / focus not moving').toBeLessThan(3);
    const header = [...visited].filter((v) => /\/shopify|\/work|\/case-studies|Products|Contacts|Book a call/.test(v));
    expect(header.length, `header items reached by Tab: ${header.join(' ; ')}`).toBeGreaterThanOrEqual(5);
  });

  test(qase(25193, 'A11Y — focus indicator always visible'), async ({ page }) => {
    await page.goto('/');
    const noOutline: string[] = [];
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const r = await page.evaluate(() => {
        const e = document.activeElement as HTMLElement;
        if (!e || e === document.body) return null;
        const s = getComputedStyle(e);
        const visible = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none';
        return visible ? null : `${e.tagName} ${(e.textContent ?? e.getAttribute('aria-label') ?? '').trim().slice(0, 25)}`;
      });
      if (r) noOutline.push(r);
    }
    expect.soft(noOutline, 'focused elements without outline / box-shadow').toEqual([]);
  });

  test(qase(25194, 'A11Y — text contrast ratio >= 4.5:1 (WCAG AA)'), async ({ page }) => {
    for (const path of KEY_PAGES) {
      await test.step(path, async () => {
        await page.goto(path);
        const res = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
        const nodes = res.violations.flatMap((v) => v.nodes.map((n) => `${n.target.join(' ')} — ${n.any[0]?.message ?? ''}`.slice(0, 160)));
        expect.soft(nodes, `${path}: contrast violations`).toEqual([]);
      });
    }
  });

  test.describe('375px', () => {
    test.use({ viewport: { width: 375, height: 812 } });
    test(qase(25195, 'A11Y — burger menu button has aria-expanded attribute (open/closed states)'), async ({ page, mobileMenu }) => {
      await page.goto('/');
      await expect(mobileMenu.burger).toHaveAttribute('aria-expanded', 'false');
      await mobileMenu.open();
      await expect(mobileMenu.burger).toHaveAttribute('aria-expanded', 'true');
      await mobileMenu.burger.click();
      await expect(mobileMenu.burger).toHaveAttribute('aria-expanded', 'false');
      await mobileMenu.burger.focus();
      await page.keyboard.press('Enter');
      await expect(mobileMenu.panel).toBeVisible();
    });
  });

  test.describe('200% zoom (720px CSS viewport)', () => {
    // 200% browser zoom on a 1440px window == 720px CSS viewport with DPR 2
    test.use({ viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 });
    test(qase(25196, 'A11Y — page zoom to 200% does not cause horizontal scroll'), async ({ page }) => {
      for (const path of KEY_PAGES) {
        await test.step(path, async () => {
          await page.goto(path);
          await expectNoHorizontalScroll(page);
        });
      }
    });
  });

  test(qase(25197, 'A11Y — Esc closes modal; focus trapped inside and returned to trigger'), async ({ page, header, modals }) => {
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'open lets talk modal button' }).first();
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(modals.pipedriveIframe).toBeVisible();
    await test.step('focus stays inside modal', async () => {
      for (let i = 0; i < 15; i++) await page.keyboard.press('Tab');
      const insideHeader = await header.root.evaluate((h) => h.contains(document.activeElement));
      expect(insideHeader, 'focus escaped to page header behind modal').toBe(false);
    });
    await page.keyboard.press('Escape');
    await expect(modals.pipedriveIframe).toBeHidden();
    expect(await trigger.evaluate((t) => t === document.activeElement), 'focus not returned to trigger').toBe(true);
  });

  test.describe('prefers-reduced-motion', () => {
    test.use({ contextOptions: { reducedMotion: 'reduce' } });
    test(qase(25198, 'A11Y — prefers-reduced-motion: animations are reduced/disabled'), async ({ page }) => {
      for (const path of ['/', '/shopify', '/about']) {
        await test.step(path, async () => {
          await page.goto(path);
          const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && ((a.effect?.getTiming().iterations ?? 1) === Infinity)).length);
          expect.soft(running, `${path}: infinite animations still running with reduced motion`).toBe(0);
          const hidden = await page.locator('main h2').evaluateAll((hs) => hs.filter((h) => getComputedStyle(h).opacity === '0').length);
          expect.soft(hidden, `${path}: content hidden (opacity 0) with reduced motion`).toBe(0);
        });
      }
    });
  });
});
