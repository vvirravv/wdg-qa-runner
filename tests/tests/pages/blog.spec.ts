import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { brokenImages, placeholderTokens, scrollThrough } from '../../src/helpers';

const cards = (page: import('@playwright/test').Page) => page.locator('main a[href^="/blog/"]:has(h2)');
const ARTICLE = '/blog/how-we-use-ai-in-devit';

test.describe('Blog — Functional', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/blog'); });

  test(qase(25408, 'Blog — no broken images on article cards'), async ({ page }) => {
    await scrollThrough(page);
    expect(await brokenImages(page)).toEqual([]);
  });

  test(qase(25409, 'Blog — cards display title, category, read time, date'), async ({ page }) => {
    const n = Math.min(await cards(page).count(), 5);
    expect(n).toBe(5);
    for (let i = 0; i < n; i++) {
      const c = cards(page).nth(i);
      const text = await c.innerText();
      expect.soft(await c.locator('h2').innerText(), `card ${i} title`).not.toMatch(/^$|undefined|null/);
      expect.soft(text, `card ${i} read time`).toMatch(/\d+m read/);
      expect.soft(text, `card ${i} date`).toMatch(/[A-Z][a-z]+ \d{1,2}, \d{4}/);
      expect.soft(text, `card ${i} category`).toMatch(/Insights|Startups|Software Development|AI \/ ML/);
      expect.soft(await c.locator('img').count(), `card ${i} thumbnail`).toBeGreaterThan(0);
    }
  });

  test(qase(25410, 'Blog — category filter checkboxes work'), async ({ page }) => {
    const insights = page.getByRole('checkbox', { name: 'Insights' });
    const ai = page.getByRole('checkbox', { name: 'AI / ML' });
    await expect(insights).not.toBeChecked();
    const all = await cards(page).count();
    await insights.click();
    await expect(insights).toBeChecked();
    await expect(page).toHaveURL(/topics=Insights/);
    await expect.poll(async () => (await cards(page).allInnerTexts()).every((t) => t.includes('Insights'))).toBe(true);
    await ai.click();
    await expect.poll(async () => (await cards(page).allInnerTexts()).every((t) => /Insights|AI \/ ML/.test(t))).toBe(true);
    await insights.click(); await ai.click();
    await expect.poll(() => cards(page).count()).toBe(all);
  });

  test(qase(25411, 'Blog — clicking a card opens the article, Back returns to list'), async ({ page }) => {
    const first = cards(page).first();
    const title = (await first.locator('h2').innerText()).trim();
    await first.click();
    await expect(page.locator('h1')).toHaveText(title);
    expect(await placeholderTokens(page)).toEqual([]);
    await page.goBack();
    await expect(page).toHaveURL(/\/blog$/);
    expect(await cards(page).count()).toBeGreaterThan(0);
  });

  test(qase(25412, 'Blog — pagination works (Prev / Next / page numbers)'), async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Page 1 is your current page' })).toBeVisible();
    const p1 = await cards(page).locator('h2').allInnerTexts();
    await page.getByRole('link', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect.poll(() => cards(page).locator('h2').allInnerTexts()).not.toEqual(p1);
    await page.getByRole('link', { name: 'Previous page' }).click();
    await expect.poll(() => cards(page).locator('h2').allInnerTexts()).toEqual(p1);
  });

  test(qase(25413, 'Blog — category filter shows only matching articles'), async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Startups' }).click();
    await expect.poll(async () => (await cards(page).allInnerTexts()).every((t) => t.includes('Startups'))).toBe(true);
    await page.getByRole('checkbox', { name: 'Startups' }).click();
    await expect(page).toHaveURL(/\/blog$/);
  });

  test(qase(25414, 'Blog — /blog/{slug} accessible from listing, different articles unique'), async ({ page }) => {
    const hrefs = await cards(page).evaluateAll((as) => as.slice(0, 2).map((a) => a.getAttribute('href')!));
    const h1s: string[] = [];
    for (const h of hrefs) {
      await page.goto('/blog');
      await page.locator(`main a[href="${h}"]`).first().click();
      await expect(page).toHaveURL(new RegExp(`${h}$`));
      h1s.push(await page.locator('h1').innerText());
    }
    expect(new Set(h1s).size).toBe(2);
  });
});

test.describe('Blog Article — Functional', () => {
  test.beforeEach(async ({ page }) => { await page.goto(ARTICLE); });

  test(qase(25424, 'Blog article — social share links open in new tab'), async ({ page }) => {
    const share = page.locator('main a[href*="linkedin.com/share"], main a[href*="twitter.com/intent"], main a[href*="x.com/intent"], main a[href*="facebook.com/sharer"]');
    expect(await share.count(), 'no social share links in article').toBeGreaterThan(0);
    expect(await share.evaluateAll((as) => as.filter((a) => a.getAttribute('target') !== '_blank').length)).toBe(0);
    const li = await share.filter({ has: page.locator('[href*="linkedin"]') }).first().getAttribute('href');
    if (li) expect(li).toContain(encodeURIComponent('devit.group/blog'));
  });

  test(qase(25425, "Blog article — 'Back to articles' returns to /blog"), async ({ page }) => {
    await page.getByRole('link', { name: 'Back to articles' }).click();
    await expect(page).toHaveURL(/\/blog$/);
    await expect(page.locator('h1')).toHaveText('Our Blog');
  });

  test(qase(25426, "Blog article — 'Table of content' anchors scroll to correct sections"), async ({ page }) => {
    const toc = page.locator(`main a[href^="${ARTICLE}#"]`);
    const n = await toc.count();
    expect(n).toBeGreaterThan(2);
    for (let i = 0; i < n; i++) {
      const link = toc.nth(i);
      const label = (await link.innerText()).trim();
      await link.click();
      const heading = page.locator('main').getByRole('heading', { name: label, exact: true }).first();
      await expect(heading, `TOC "${label}"`).toBeInViewport();
    }
  });

  test(qase(25427, 'Blog article — FAQ accordion expands and collapses'), async ({ page }) => {
    const faq = page.getByRole('heading', { name: 'FAQ', level: 2 }).locator('xpath=ancestor::section[1]');
    const qs = faq.getByRole('heading', { level: 3 });
    expect(await qs.count()).toBeGreaterThan(0);
    const q = qs.first();
    const answer = q.locator('xpath=following::*[self::p or self::div][normalize-space()][1]');
    await q.click();
    await expect(answer).toBeVisible();
    await q.click();
    await expect.soft(answer, 'FAQ answer does not collapse').toBeHidden();
  });

  test(qase(25428, "Blog article — 'Get a Quote' banner -> /calculator"), async ({ page }) => {
    await scrollThrough(page);
    expect(await brokenImages(page)).toEqual([]);
    await page.getByRole('link', { name: 'Get a Quote' }).click();
    await expect(page).toHaveURL(/\/calculator$/);
    await expect(page.getByText('Question 1 of 5')).toBeVisible();
  });

  test(qase(25429, 'Blog article — external links open in new tab with noopener; Read More internal'), async ({ page }) => {
    const ext = await page.locator('main article a[href^="http"], main a[href^="http"]').evaluateAll((as) =>
      as.filter((a) => !a.getAttribute('href')!.includes('devit.group/blog')).map((a) => ({ h: a.getAttribute('href'), t: a.getAttribute('target'), r: a.getAttribute('rel') ?? '' })));
    expect.soft(ext.filter((l) => l.t !== '_blank').map((l) => l.h), 'external links without target=_blank').toEqual([]);
    expect.soft(ext.filter((l) => !/noopener|noreferrer/.test(l.r)).map((l) => l.h), 'external links without noopener').toEqual([]);
    const readMore = page.getByRole('heading', { name: 'Read More', level: 2 }).locator('xpath=ancestor::section[1]').locator('a[href^="/blog/"]').first();
    const href = (await readMore.getAttribute('href'))!;
    await readMore.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
  });
});
