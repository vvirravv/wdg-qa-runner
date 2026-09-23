import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { brokenImages, scrollThrough } from '../../src/helpers';

test.describe('About — Functional', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/about'); });
  const section = (page: import('@playwright/test').Page, h2: string | RegExp) =>
    page.getByRole('heading', { name: h2, level: 2 }).locator('xpath=ancestor::section[1]');

  test(qase(25364, "About — hero video + H1 'We are DevIT'"), async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('We are DevIT');
    const video = page.locator('main video').first();
    if (await video.count()) {
      await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.muted && !v.paused)).toBe(true);
      await video.click();
      await expect.soft(page.getByRole('heading', { level: 1 }), 'H1 should hide when sound is on').toBeHidden();
    } else {
      await expect(page.getByRole('button', { name: 'play button' }).first()).toBeAttached();
    }
  });

  test(qase(25365, 'About — Video: PLAY button follows cursor when paused (partial)'), async ({ page }) => {
    const play = page.getByRole('button', { name: 'play button' }).first();
    const hero = page.locator('main section').first();
    const box = (await hero.boundingBox())!;
    await page.mouse.move(box.x + 200, box.y + 200);
    const p1 = await play.boundingBox();
    await page.mouse.move(box.x + 600, box.y + 350, { steps: 5 });
    await page.waitForTimeout(300);
    const p2 = await play.boundingBox();
    expect(p1 && p2 && (p1.x !== p2.x || p1.y !== p2.y), 'PLAY button does not follow cursor').toBe(true);
  });

  test(qase(25366, 'About — Video: no native controls, loops'), async ({ page }) => {
    const video = page.locator('main video').first();
    test.skip(!(await video.count()), 'hero video is not a <video> element (iframe player)');
    expect(await video.evaluate((v: HTMLVideoElement) => ({ controls: v.controls, loop: v.loop }))).toEqual({ controls: false, loop: true });
  });

  test(qase(25367, "About — 'Where are our clients from' section: slider"), async ({ page }) => {
    const s = section(page, 'Where are our clients from');
    await s.scrollIntoViewIfNeeded();
    await expect(s).toBeVisible();
    const before = await s.innerHTML();
    await s.locator('button').filter({ visible: true }).last().click();
    await page.waitForTimeout(600);
    expect(await s.innerHTML()).not.toBe(before);
  });

  for (const id of [25368, 25373]) {
    test(qase(id, id === 25368 ? "About — 'Some numbers about us' stats are real values" : "About — counters animate on scroll and never stay at '000'"), async ({ page }) => {
      const s = section(page, 'Some numbers about us');
      await s.scrollIntoViewIfNeeded();
      await expect.poll(async () => (await s.getByRole('heading', { level: 2 }).allInnerTexts()).slice(1).map((t) => parseInt(t, 10)), { timeout: 10_000 })
        .toEqual([expect.any(Number), expect.any(Number), expect.any(Number)]);
      const values = (await s.getByRole('heading', { level: 2 }).allInnerTexts()).slice(1).map((t) => parseInt(t, 10));
      expect(values.every((v) => v > 0), `values ${values}`).toBe(true);
      if (id === 25373) {
        await page.reload();
        await s.scrollIntoViewIfNeeded();
        await page.waitForTimeout(3000);
        const after = (await s.getByRole('heading', { level: 2 }).allInnerTexts()).slice(1);
        expect(after.filter((t) => /^0+\+?$/.test(t.trim())), 'counter stuck at 0/000 after reload').toEqual([]);
      }
    });
  }

  test(qase(25369, 'About — Leaderboard: team photos with names'), async ({ page }) => {
    const s = section(page, 'Leaderboard');
    await s.scrollIntoViewIfNeeded();
    await scrollThrough(page);
    expect(await s.locator('img').count()).toBeGreaterThan(2);
    expect(await brokenImages(page)).toEqual([]);
  });

  test(qase(25370, 'About — Representatives: photo, name, flag'), async ({ page }) => {
    const s = section(page, 'Representatives');
    await s.scrollIntoViewIfNeeded();
    expect(await s.locator('img').count(), 'photos + flags').toBeGreaterThanOrEqual(4);
    expect((await s.innerText()).trim().length).toBeGreaterThan(20);
  });

  test(qase(25371, "About — 'How we are working': all items populated"), async ({ page }) => {
    const s = section(page, 'How we are working');
    await s.scrollIntoViewIfNeeded();
    const text = await s.innerText();
    expect(text).not.toMatch(/undefined|null/);
    expect((text.match(/\b0?\d\b/g) ?? []).length, 'numbered items').toBeGreaterThanOrEqual(3);
  });

  test(qase(25372, "About — bottom CTA: 'Get in touch' works"), async ({ page, modals }) => {
    await expect(page.getByRole('heading', { name: /Let.s talk/, level: 2 })).toBeAttached();
    await expect(page.getByRole('heading', { name: /realise your own project/, level: 2 })).toBeAttached();
    await page.getByRole('button', { name: 'lets talk button' }).filter({ hasText: 'Get in touch' }).click();
    await expect(modals.pipedriveIframe).toBeVisible();
  });

  test(qase(25374, 'About — Leadership card: LinkedIn icon and Booking button'), async ({ page }) => {
    const li = page.locator('main a[aria-label$="LinkedIn"]').first();
    await li.scrollIntoViewIfNeeded();
    await expect(li).toHaveAttribute('href', /linkedin\.com\/in\//);
    await expect(li).toHaveAttribute('target', '_blank');
    await expect.soft(li).toHaveAttribute('rel', /noopener/);
    const book = page.getByRole('button', { name: /Book a meeting|Booking/i }).or(page.getByRole('link', { name: /Book a meeting/i })).first();
    await expect.soft(book, "'Book a meeting' button").toBeVisible();
  });

  test(qase(25375, 'About — representative video interview opens in modal (partial)'), async ({ page }) => {
    const play = page.locator('main').getByRole('button', { name: 'play button' }).last();
    await play.scrollIntoViewIfNeeded();
    await play.click({ force: true });
    const player = page.locator('video, iframe[src*="cloudflarestream"], iframe[src*="youtube"]').filter({ visible: true }).last();
    await expect(player).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(player).toBeHidden();
  });

  test(qase(25376, "About — 'Meet our CEO' video: preview, click opens with sound (partial)"), async ({ page }) => {
    const ceo = page.getByText(/Meet our CEO/i).first();
    await expect(ceo, "'Meet our CEO' block missing").toBeVisible();
    await ceo.scrollIntoViewIfNeeded();
    const video = ceo.locator('xpath=ancestor::section[1]').locator('video').first();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.muted && v.loop && !v.paused)).toBe(true);
    await video.click();
    await expect.poll(() => page.locator('video').filter({ visible: true }).last().evaluate((v: HTMLVideoElement) => !v.muted && v.currentTime < 3)).toBe(true);
  });
});
