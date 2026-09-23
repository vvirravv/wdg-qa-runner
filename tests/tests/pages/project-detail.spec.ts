import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { brokenImages, placeholderTokens, scrollThrough } from '../../src/helpers';

const SLUG = '/work/real-americas-voice';

test.describe('Project Detail — Functional', () => {
  test.beforeEach(async ({ page }) => { await page.goto(SLUG); });

  test(qase(25291, 'Project — all images load (no 404 in Network)'), async ({ page }) => {
    const bad: string[] = [];
    page.on('response', (r) => { if (r.request().resourceType() === 'image' && r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
    await page.reload();
    await scrollThrough(page);
    expect(bad).toEqual([]);
    expect(await brokenImages(page)).toEqual([]);
  });

  test(qase(25292, 'Project — hero image loads and title is correct'), async ({ page }) => {
    await expect(page.locator('h1')).toHaveText(/^"?Real America's Voice"?$/);
    expect.soft(await page.locator('h1').innerText(), 'H1 wrapped in literal quotes').not.toMatch(/^"/);
    const hero = page.locator('main img').first();
    await expect(hero).toBeVisible();
    expect(await hero.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  });

  test(qase(25293, 'Project — all content sections are populated'), async ({ page }) => {
    for (const h of ['About', "Client's Request", 'Here’s What We Did', 'Here’s the Result']) {
      const heading = page.getByRole('heading', { name: h });
      await expect.soft(heading, h).toBeVisible();
      const text = await heading.locator('xpath=following-sibling::*[1]').innerText().catch(() => '');
      expect.soft(text.trim().length, `${h}: section text`).toBeGreaterThan(40);
    }
    expect(await placeholderTokens(page)).toEqual([]);
  });

  test(qase(25294, 'Project — metadata fields are all populated'), async ({ page }) => {
    for (const h of ['Technology stack', 'Category', 'Tags']) {
      const block = page.getByRole('heading', { name: h, level: 3 }).locator('xpath=..');
      await expect.soft(block.locator('a, li, span').first(), `${h} empty`).toBeVisible();
    }
    for (const label of ['Industry', 'System type', 'Time to release', 'Billable hours']) {
      await expect.soft(page.getByText(label, { exact: false }).first(), `metadata "${label}"`).toBeVisible();
    }
    expect(await page.locator('main').innerText()).not.toMatch(/\bundefined\b|\bnull\b/);
  });

  test(qase(25295, 'Project — external link opens correct site in new tab'), async ({ page }) => {
    const link = page.locator('main a[href="https://americasvoice.news"]');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
    const popup = page.context().waitForEvent('page');
    await link.click();
    await expect(await popup).toHaveURL(/americasvoice\.news/);
  });

  test(qase(25296, 'Project Detail — screenshots modal slider: open, arrows, close'), async ({ page }) => {
    await scrollThrough(page);
    const shot = page.locator('main img[class*="slide" i], main [class*="gallery" i] img, main [class*="screens" i] img').first();
    test.skip(!(await shot.count()), 'no screenshots gallery on this project');
    await shot.click();
    const modal = page.locator('[class*="odal"]').filter({ has: page.locator('img') }).filter({ visible: true }).last();
    await expect(modal).toBeVisible();
    const src = () => modal.locator('img').filter({ visible: true }).first().getAttribute('src');
    const first = await src();
    await page.keyboard.press('ArrowRight');
    await modal.locator('button').filter({ visible: true }).last().click().catch(() => undefined);
    await expect.poll(src).not.toBe(first);
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  });

  test(qase(25297, 'Project Detail — review video plays when play button clicked'), async ({ page }) => {
    const play = page.getByRole('button', { name: 'play review video button' });
    await play.scrollIntoViewIfNeeded();
    await play.click();
    const player = page.locator('video, iframe[src*="cloudflarestream"], iframe[src*="youtube"]').filter({ visible: true }).first();
    await expect(player).toBeVisible();
    if (await player.evaluate((e) => e.tagName === 'VIDEO')) {
      await expect.poll(() => player.evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);
      expect(await player.evaluate((v: HTMLVideoElement) => v.muted), 'review video must have sound').toBe(false);
    }
  });

  test(qase(25298, 'Project Detail — Solution section CTAs work (partial: no submit)'), async ({ page, modals }) => {
    const section = page.getByRole('heading', { name: 'We’ll offer the best solution for you!' }).locator('xpath=ancestor::section[1]');
    await section.scrollIntoViewIfNeeded();
    await section.getByRole('button', { name: 'Book a call' }).click();
    await expect(modals.functionalCookiesPopup.or(modals.calendlyIframe)).toBeVisible();
    await page.keyboard.press('Escape');
    await page.reload();
    await section.getByRole('button', { name: 'Fill out form' }).click();
    await expect(modals.pipedriveIframe).toBeVisible();
    await expect.soft(section.getByRole('button', { name: 'Fill out form' }), 'all 3 CTAs share aria-label "lets talk button"').not.toHaveAccessibleName('lets talk button');
  });

  test(qase(25299, 'Project Detail — Shopify App Store link points to the correct app'), async ({ page }) => {
    await page.goto('/work/aftersell');
    const link = page.locator('main a[href*="apps.shopify.com"]').first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /apps\.shopify\.com\/[\w-]*after/i);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
  });

  test(qase(25300, 'Project Detail — technology tag links filter /work by technology'), async ({ page }) => {
    const tag = page.locator('main a[href*="technologies="]').first();
    const name = (await tag.innerText()).trim();
    await tag.click();
    await expect(page).toHaveURL(/\/work\?technologies=/);
    const c = await page.getByText(/Showing \d+ projects out of \d+/).innerText();
    expect(Number(c.match(/Showing (\d+)/)![1])).toBeGreaterThan(0);
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  });

  test(qase(25301, 'Project Detail — category/tag links filter /work correctly'), async ({ page }) => {
    await page.locator('main a[href*="categories="]').first().click();
    await expect(page).toHaveURL(/\/work\?categories=/);
    await expect(page.getByText(/Showing \d+ projects out of \d+/)).toBeVisible();
    await page.goto(SLUG);
    await page.locator('main a[href*="tags="]').first().click();
    await expect(page).toHaveURL(/\/work\?tags=/);
    await expect(page.getByText(/Showing \d+ projects out of \d+/)).toBeVisible();
  });

  test(qase(25303, "Project Detail — 'I want similar': 'Get in touch' opens form (partial)"), async ({ page, modals }) => {
    const h = page.getByRole('heading', { name: 'I want similar', level: 2 });
    await h.scrollIntoViewIfNeeded();
    await expect(h).toBeVisible();
    await page.getByRole('button', { name: 'get in touch button' }).click();
    await expect(modals.pipedriveIframe).toBeVisible();
  });

  test(qase(25304, 'Project Detail — breadcrumb / back navigation returns to /work'), async ({ page }) => {
    const back = page.locator('main a[href="/work"]').filter({ hasText: /work|back|portfolio/i }).first();
    await expect(back, 'no breadcrumb / Back to Work link').toBeVisible();
    await back.click();
    await expect(page).toHaveURL(/\/work$/);
  });
});
