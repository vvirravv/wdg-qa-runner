import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { brokenImages, scrollThrough } from '../../src/helpers';

const SLIDES = [
  { id: 'american_voice', title: "Real America's Voice", link: /\/case-studies\/real-america-voice|\/work\/real-americas-voice/ },
  { id: 'weather_nation', title: 'Weather Nation', link: /\/work\/weather-nation/ },
  { id: 'unlocked_networks', title: 'Unlocked Networks', link: /\/work\/unlocked-networks/ },
];

test.describe('Case Studies — Functional', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/case-studies'); });

  test(qase(25457, 'Case Studies — no broken images (backgrounds load)'), async ({ page }) => {
    const bad: string[] = [];
    page.on('response', (r) => { if (r.request().resourceType() === 'image' && r.status() >= 400) bad.push(r.url()); });
    await page.reload();
    await scrollThrough(page);
    expect(bad).toEqual([]);
    expect(await brokenImages(page)).toEqual([]);
  });

  test(qase(25458, 'Case Studies — all slides present and populated'), async ({ page }) => {
    for (const s of SLIDES) {
      const sec = page.locator(`section#${s.id}`);
      await expect(sec.getByRole('heading', { level: 2 })).toHaveText(s.title);
      expect((await sec.innerText()).trim().length, `${s.title} description`).toBeGreaterThan(s.title.length + 20);
    }
    await expect.soft(page.locator('main section[id]'), 'TC expects 4 slides (incl. iMobile)').toHaveCount(4);
  });

  test(qase(25459, 'Case Studies — slider navigation works'), async ({ page }) => {
    await page.locator('a[href="/case-studies#weather_nation"]').filter({ visible: true }).first().click();
    await expect(page.locator('section#weather_nation')).toBeInViewport();
    await page.locator('a[href="/case-studies#unlocked_networks"]').filter({ visible: true }).first().click();
    await expect(page.locator('section#unlocked_networks')).toBeInViewport();
    await page.locator('a[href="/case-studies#weather_nation"]').filter({ visible: true }).first().click();
    await expect(page.locator('section#weather_nation')).toBeInViewport();
  });

  test(qase(25460, 'Case Studies — clicking a case study opens its detail page'), async ({ page }) => {
    await page.locator('section#american_voice a[href^="/case-studies/"], section#american_voice a[href^="/work/"]').filter({ visible: true }).first().click();
    await expect(page).toHaveURL(SLIDES[0].link);
    await expect(page.locator('h1, h2').first()).toContainText(/Real America/);
  });

  test(qase(25461, "Case Studies — 'View all work' CTA navigates to /work"), async ({ page }) => {
    const cta = page.locator('main a[href="/work"]').filter({ visible: true }).first();
    await expect(cta, "no 'View all work' CTA on /case-studies").toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/\/work$/);
  });

  test(qase(25462, 'Case Studies — each slide has its own working link'), async ({ page, request }) => {
    const hrefs: string[] = [];
    for (const s of SLIDES) {
      const href = await page.locator(`section#${s.id} a[href^="/case-studies/"], section#${s.id} a[href^="/work/"]`).first().getAttribute('href');
      expect(href, `${s.title}: link`).toMatch(s.link);
      expect.soft((await request.get(href!)).status(), href!).toBe(200);
      hrefs.push(href!);
    }
    expect(new Set(hrefs).size).toBe(SLIDES.length);
  });
});
