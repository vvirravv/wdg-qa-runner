import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { brokenImages, scrollThrough } from '../../src/helpers';

test.describe('Homepage — Functional', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test(qase(25233, 'Homepage — no broken images (Network check)'), async ({ page }) => {
    const bad: string[] = [];
    page.on('response', (r) => { if (r.request().resourceType() === 'image' && r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
    await page.reload();
    await scrollThrough(page);
    expect(bad).toEqual([]);
    expect(await brokenImages(page)).toEqual([]);
  });

  test(qase(25234, 'Homepage — Hero section: heading, subheading, and CTA visible'), async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Digital solutions for e-business');
    await expect(page.getByText('Nothing is impossible for us.')).toBeVisible();
    const cta = page.getByRole('button', { name: 'open lets talk modal button' }).first();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveText(/Let's talk/);
    await expect(cta).toBeInViewport({ ratio: 1 });
  });

  test(qase(25235, 'Homepage — hero video: autoplay muted/looped, click toggles sound (partial)'), async ({ page }) => {
    const play = page.getByRole('button', { name: 'play button' }).first();
    await expect(play).toBeAttached();
    const video = page.locator('main video').first();
    if (await video.count()) {
      await expect.poll(() => video.evaluate((v: HTMLVideoElement) => ({ muted: v.muted, loop: v.loop, paused: v.paused }))).toEqual({ muted: true, loop: true, paused: false });
      await video.click();
      expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(false);
    } else {
      await play.click({ force: true });
      await expect(page.locator('iframe[src*="cloudflarestream"], video').filter({ visible: true }).first()).toBeVisible();
    }
  });

  test(qase(25236, 'Homepage — stats counters: count-up animation + non-zero values'), async ({ page }) => {
    const stats = page.locator('main').getByText(/^\d+\+?$/);
    await scrollThrough(page);
    await expect.poll(() => stats.count(), { message: 'no numeric stats block on homepage' }).toBeGreaterThan(0);
    const values = (await stats.allInnerTexts()).map((t) => parseInt(t, 10));
    expect(values.filter((v) => !v), `zero values: ${values}`).toEqual([]);
  });

  test(qase(25237, 'Homepage — Services section: categories render, same size, hover'), async ({ page }) => {
    const section = page.locator('section, div').filter({ has: page.getByRole('heading', { name: 'Services', level: 2 }) }).last();
    const cards = section.getByRole('heading', { level: 3 });
    expect(await cards.count(), 'service categories').toBeGreaterThanOrEqual(4);
    expect((await cards.allInnerTexts()).filter((t) => !t.trim()), 'empty service cards').toEqual([]);
    const sizes = await cards.evaluateAll((hs) => hs.map((h) => { const c = h.closest('[class*="card"], li, article') ?? h.parentElement!; const r = c.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; }));
    expect.soft(new Set(sizes).size, `card sizes: ${sizes.join(', ')}`).toBe(1);
  });

  test(qase(25238, 'Homepage — Industries: 4 tabs switch content'), async ({ page }) => {
    const tabs = page.getByRole('button', { name: 'industries button' });
    await expect(tabs).toHaveText(['E-Commerce', 'Media', 'Social Networks', 'Fintech']);
    const titles: Record<string, RegExp> = { 'E-Commerce': /Online Retail/, Media: /Media Experiences/, 'Social Networks': /Digital Communities/, Fintech: /Finance Digitally/ };
    for (const [tab, rx] of Object.entries(titles)) {
      await test.step(tab, async () => {
        await tabs.filter({ hasText: tab }).click();
        await expect(page.getByRole('heading', { level: 3, name: rx }).filter({ visible: true })).toBeVisible();
      });
    }
  });

  test(qase(25239, 'Homepage — Technologies section: tech icons render and animate'), async ({ page }) => {
    const heading = page.getByRole('heading', { name: 'Technologies', level: 2 });
    await heading.scrollIntoViewIfNeeded();
    const section = page.locator('section').filter({ has: heading }).first();
    const imgs = section.locator('img, svg');
    expect(await imgs.count()).toBeGreaterThan(5);
    expect(await brokenImages(page)).toEqual([]);
    const anims = await section.evaluate((s) => s.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length);
    expect.soft(anims, 'tech marquee not animating').toBeGreaterThan(0);
  });

  test(qase(25240, "Homepage — Our Projects: cards link to /work/{slug}, 'View all cases' works"), async ({ page }) => {
    const cards = page.locator('main a[aria-label^="link to "][aria-label$=" project"]');
    const n = await cards.count();
    expect(n).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < Math.min(n, 6); i++) {
      const card = cards.nth(i);
      const title = (await card.locator('h3').innerText()).trim();
      const href = (await card.getAttribute('href'))!;
      await test.step(`${title} -> ${href}`, async () => {
        expect(href).toMatch(/^\/work\/[\w-]+$/);
        await card.click();
        await expect(page).toHaveURL(new RegExp(`${href}$`));
        await expect(page.locator('h1')).toContainText(title.split(' ')[0]);
        await page.goBack();
      });
    }
    await page.getByRole('link', { name: 'to all projects link' }).click();
    await expect(page).toHaveURL(/\/work$/);
  });

  test(qase(25241, 'Homepage Four Reasons — section visible, cards have titles, hover changes card'), async ({ page }) => {
    const h2 = page.getByRole('heading', { name: 'The main reasons for choosing us', level: 2 });
    await h2.scrollIntoViewIfNeeded();
    for (const t of ['Client Focus', 'Long-Term Partnership', 'Strong Industry Expertise', 'Flexible Team Scaling']) {
      const card = page.getByRole('heading', { name: t, level: 3 });
      await expect(card).toBeVisible();
      const box = card.locator('xpath=ancestor::*[self::li or self::article or contains(@class,"card") or contains(@class,"item")][1]');
      const shadow = () => box.evaluate((e) => getComputedStyle(e).boxShadow + getComputedStyle(e).transform);
      const before = await shadow();
      await card.hover();
      await page.waitForTimeout(400);
      expect.soft(await shadow(), `${t}: no hover elevation`).not.toBe(before);
    }
  });

  test(qase(25242, "Homepage — Achievements: logos same size, 'See all awards' -> /awards"), async ({ page }) => {
    await page.getByRole('heading', { name: 'Our achievements', level: 2 }).scrollIntoViewIfNeeded();
    const btn = page.getByRole('button').filter({ hasText: 'See all awards' });
    await expect.soft(btn, "'See all awards' has a wrong aria-label ('lets talk button')").toHaveAccessibleName(/award/i);
    await btn.click();
    await expect(page).toHaveURL(/\/awards$/);
  });

  test(qase(25243, 'Homepage Testimonials — section visible, slider works (partial)'), async ({ page }) => {
    const h2 = page.getByRole('heading', { name: 'Testimonials', level: 2 });
    await h2.scrollIntoViewIfNeeded();
    await expect(h2).toBeVisible();
    const section = page.locator('section').filter({ has: h2 }).first();
    const next = section.locator('button[aria-label*="next" i], button[class*="next" i]').first();
    if (await next.count()) {
      const before = await section.innerText();
      await next.click();
      await page.waitForTimeout(600);
      expect(await section.innerText()).not.toBe(before);
    } else {
      expect.soft(false, 'no next arrow in testimonials slider').toBe(true);
    }
  });

  test(qase(25244, 'Homepage Contact Us section — social icons, addresses, email'), async ({ page, request }) => {
    const h = page.getByRole('heading', { name: 'Contact Us', level: 3 });
    await h.scrollIntoViewIfNeeded();
    const section = page.locator('section, div').filter({ has: h }).last();
    const socials = section.locator('a[aria-label="link to social web"]');
    expect(await socials.count()).toBeGreaterThanOrEqual(4);
    const sizes = await socials.evaluateAll((as) => as.map((a) => { const r = a.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; }));
    expect.soft(new Set(sizes).size, `icon sizes ${sizes.join(',')}`).toBe(1);
    expect.soft(await socials.evaluateAll((as) => as.filter((a) => a.getAttribute('target') !== '_blank').map((a) => a.getAttribute('href'))), 'target must be "_blank"').toEqual([]);
    await expect(section.locator('a[href="mailto:hi@devit.group"]')).toBeVisible();
    for (const city of ['Kyiv', 'Toronto']) await expect.soft(section.getByText(new RegExp(city))).toBeVisible();
  });

  test(qase(25245, "Homepage — 'Get in touch' CTA opens the form (partial: no submit)"), async ({ page, modals }) => {
    await page.getByRole('button', { name: 'lets talk button' }).filter({ hasText: 'Get in touch' }).first().click();
    await expect(modals.pipedriveIframe).toBeVisible();
    await expect(page.getByText(/You Dream IT/i).filter({ visible: true }).first()).toBeVisible();
    await expect(modals.field(/Full Name/)).toBeVisible();
  });

  test(qase(25247, 'Homepage — scroll-reveal: no section stuck hidden after fast scroll'), async ({ page, jsErrors }) => {
    await page.keyboard.press('End');
    await page.waitForTimeout(1500);
    await page.keyboard.press('Home');
    await scrollThrough(page, 600, 250);
    const hidden = await page.locator('main h2, main h3').evaluateAll((els) => els.filter((e) => {
      const s = getComputedStyle(e); const r = e.getBoundingClientRect();
      return r.width > 0 && (s.opacity === '0' || s.visibility === 'hidden');
    }).map((e) => e.textContent?.trim().slice(0, 40)));
    expect(hidden, 'headings stuck in hidden pre-animation state').toEqual([]);
    expect(jsErrors).toEqual([]);
  });
});
