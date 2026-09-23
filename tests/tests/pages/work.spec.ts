import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { WorkPage } from '../../src/pom/WorkPage';
import { brokenImages, scrollThrough } from '../../src/helpers';

test.describe('Work — Functional', () => {
  let work: WorkPage;
  test.beforeEach(async ({ page }) => { work = new WorkPage(page); await work.open(); });

  test(qase(25265, 'Work — no broken images on cards'), async ({ page }) => {
    await scrollThrough(page);
    expect(await brokenImages(page)).toEqual([]);
  });

  test(qase(25266, 'Work — all industry sections / filter tabs present'), async ({ page }) => {
    const expected = ['e-commerce', 'media', 'social-networks', 'healthcare', 'fintech', 'real-estate', 'construction', 'entertainment', 'travel-hospitality', 'education'];
    for (const id of expected) await expect.soft(page.locator(`a[href="/work#${id}"]`), `anchor #${id}`).toHaveCount(1);
  });

  test(qase(25267, 'Work — clicking category filter shows only matching projects'), async ({ page }) => {
    for (const industry of ['Media', 'Healthcare']) {
      await test.step(industry, async () => {
        await work.open();
        await work.filtersButton.click();
        await work.filterCategory('Industries').click();
        await work.filterOption(industry).click();
        await expect(page).toHaveURL(new RegExp(`industries=${industry}`));
        await expect(page.locator('main h2').first()).toHaveText(industry);
        const sections = await page.locator('main section[id]').count();
        expect(sections, 'other industry sections still shown').toBe(1);
      });
    }
  });

  test(qase(25268, 'Work — globe opens country filter, filter icon opens category filters'), async ({ page }) => {
    await test.step('country filter', async () => {
      await work.marketsButton.click();
      await page.locator('main li button').filter({ hasText: /^Germany$/ }).click();
      await expect(page).toHaveURL(/countries=Germany/);
      const { shown, total } = await work.counts();
      expect(shown).toBeLessThan(total);
    });
    await work.open();
    await work.filtersButton.click();
    for (const c of ['Industries', 'System types', 'Categories', 'Platforms', 'Technologies', 'Services', 'Tags']) {
      await expect.soft(work.filterCategory(c), `filter category ${c}`).toBeVisible();
    }
    await test.step('combine two filters (AND)', async () => {
      await work.filterCategory('Industries').click();
      await work.filterOption('E-Commerce').click();
      const one = (await work.counts()).shown;
      await work.filterCategory('Technologies').click();
      await work.filterOption('React.js').click();
      await expect(page).toHaveURL(/industries=.*technologies=|technologies=.*industries=/);
      expect((await work.counts()).shown).toBeLessThanOrEqual(one);
    });
    await test.step('clear all', async () => {
      await work.clearAll.click();
      await expect(page).toHaveURL(/\/work$/);
    });
  });

  test(qase(25269, 'Work — search bar: keyword shows Projects and Technologies groups @critical'), async ({ page }) => {
    await work.search.fill('React');
    await expect(page.getByText('Projects', { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText('Technologies', { exact: true }).filter({ visible: true })).toBeVisible();
    await work.searchResult('React.js').click();
    await expect(page).toHaveURL(/technologies=React\.js/);
    await expect(work.counter).toBeVisible();
    await test.step('project-only keyword', async () => {
      await work.search.fill('Heliguy');
      await expect(page.getByText('Projects', { exact: true }).filter({ visible: true })).toBeVisible();
      await expect(page.getByText('Technologies', { exact: true }).filter({ visible: true })).toBeHidden();
    });
    await test.step('no matches', async () => {
      await work.search.fill('zzzzz');
      await expect(work.noResults).toBeVisible();
    });
  });

  test(qase(25270, 'Work — search bar: no results state for unknown keyword'), async ({ jsErrors }) => {
    await work.search.fill('zzzznonexistent');
    await expect(work.noResults).toBeVisible();
    expect(jsErrors).toEqual([]);
  });

  test(qase(25271, 'Work — search bar: clearing input restores all projects'), async ({ page }) => {
    const before = await work.projectCards.count();
    await work.search.fill('zzzznonexistent');
    await expect(work.noResults).toBeVisible();
    await work.clearSearch.click();
    await expect(work.search).toHaveValue('');
    await expect(work.noResults).toBeHidden();
    expect(await work.projectCards.count()).toBe(before);
    await expect(page).toHaveURL(/\/work$/);
  });

  test(qase(25272, 'Work — project cards contain title, image, flag, tags'), async ({ page }) => {
    const cards = page.locator('section#e-commerce a[aria-label="link to single project"]:has(h3)');
    const n = Math.min(await cards.count(), 10);
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const card = cards.nth(i).locator('xpath=ancestor::*[.//img][1]');
      const title = (await cards.nth(i).innerText()).trim();
      expect.soft(title).not.toMatch(/^$|undefined|null/);
      expect.soft(await card.locator('img').count(), `${title}: image/flag`).toBeGreaterThanOrEqual(2);
      expect.soft(await card.locator('a[href*="technologies="]').count(), `${title}: tech tags`).toBeGreaterThan(0);
    }
  });

  test(qase(25273, 'Work — clicking a card navigates to correct project detail page'), async ({ page }) => {
    await page.locator('a[href="/work/real-americas-voice"]').filter({ hasText: /Real America/ }).first().click();
    await expect(page).toHaveURL(/\/work\/real-americas-voice$/);
    await expect(page.locator('h1')).toContainText("Real America's Voice");
    await page.goBack();
    const other = page.locator('section#e-commerce a[aria-label="link to single project"]:has(h3)').first();
    const href = (await other.getAttribute('href'))!;
    const title = (await other.innerText()).trim();
    await other.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.locator('h1')).toContainText(title.split(' ')[0]);
  });

  test(qase(25274, 'Work — carousel / lazy load shows more cards without duplicates'), async ({ page }) => {
    const section = work.section('e-commerce');
    const counter = section.getByText(/^\d+ \/ \d+$/).first();
    await expect(counter).toBeVisible();
    const total = Number((await counter.innerText()).split('/')[1]);
    await scrollThrough(page);
    const hrefs = await section.locator('a[aria-label="link to single project"]:has(h3)').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect(new Set(hrefs).size, 'duplicate cards').toBe(hrefs.length);
    expect(hrefs.length).toBeLessThanOrEqual(total);
  });

  test(qase(25275, 'Work — carousel: arrows navigate, rapid clicks handled'), async ({ page, jsErrors }) => {
    const section = work.section('e-commerce');
    const counter = section.getByText(/^\d+ \/ \d+$/).first();
    const next = section.locator('button').filter({ visible: true }).last();
    await next.click();
    await expect(counter).toHaveText(/^2 \/ /);
    for (let i = 0; i < 6; i++) await next.click({ delay: 30 });
    await page.waitForTimeout(800);
    const n = Number((await counter.innerText()).split('/')[0]);
    expect(n).toBeGreaterThanOrEqual(2);
    expect(jsErrors).toEqual([]);
  });

  test(qase(25276, 'Work — carousel: images match project names (alt text)'), async ({ page }) => {
    const cards = page.locator('section#e-commerce a[aria-label="link to single project"]:not(:has(h3))');
    const n = Math.min(await cards.count(), 6);
    for (let i = 0; i < n; i++) {
      const href = (await cards.nth(i).getAttribute('href'))!;
      const alt = (await cards.nth(i).locator('img').first().getAttribute('alt')) ?? '';
      const title = (await page.locator(`section#e-commerce a[href="${href}"] h3`).first().innerText()).trim();
      expect.soft(alt.toLowerCase(), `${href}: image alt "${alt}" vs title "${title}"`).toContain(title.split(' ')[0].toLowerCase());
    }
  });

  test(qase(25277, 'Work — vertical pagination / section anchors'), async ({ page }) => {
    const anchor = page.locator('a[href="/work#media"]');
    await expect(anchor).toHaveCount(1);
    await page.evaluate(() => window.scrollTo(0, 400));
    if (await anchor.isVisible()) {
      await anchor.click();
      await expect(page.locator('section#media')).toBeInViewport();
    } else {
      expect.soft(false, 'section pagination is hidden on desktop 1440px').toBe(true);
    }
  });

  test(qase(25278, 'Work — deep link with query params applies filters on direct open and reload'), async ({ page }) => {
    await work.open('?industries=Fintech');
    await expect(page.locator('main h2').first()).toHaveText('Fintech');
    const c1 = await work.counts();
    await page.reload();
    expect(await work.counts()).toEqual(c1);
    await work.open('?technologies=React.js');
    const c2 = await work.counts();
    expect(c2.shown).toBeLessThan(c2.total);
    await expect(page.getByText('React.js', { exact: true }).first()).toBeVisible();
    await work.clearAll.click();
    await expect(page).toHaveURL(/\/work$/);
  });

  test(qase(25279, "Work — 'Get in touch' bottom CTA opens 'Ready for cooperation?' form"), async ({ page, modals }) => {
    await page.getByRole('button', { name: 'lets talk button' }).filter({ hasText: 'Get in touch' }).click();
    await expect(modals.pipedriveIframe).toBeVisible();
    await expect(modals.pipedrive.getByText('Ready for cooperation?')).toBeVisible();
  });
});

test(qase(25280, 'Redirect — /work/{slug} HTTP -> HTTPS'), async ({ request }) => {
  const http = await import('node:http');
  const res = await new Promise<{ status: number; location?: string }>((resolve, reject) =>
    http.get({ host: 'devit.group', path: '/work/real-americas-voice' }, (r) => { resolve({ status: r.statusCode ?? 0, location: r.headers.location }); r.resume(); }).on('error', reject));
  expect([301, 302, 307, 308]).toContain(res.status);
  expect(res.location).toMatch(/^https:\/\/devit\.group\/work\/real-americas-voice/);
  expect((await request.get('/work/real-americas-voice')).status()).toBe(200);
});

test.describe('Work — SEO', () => {
  test(qase(25286, 'Work — filtered URLs return noindex instead of canonical'), async ({ request }) => {
    const clean = await (await request.get('/work')).text();
    expect(clean).toMatch(/<link rel="canonical" href="https:\/\/devit\.group\/work"/);
    expect(clean).not.toMatch(/name="robots" content="[^"]*noindex/);
    for (const q of ['?technologies=React.js', '?categories=Mobile', '?industries=Fintech', '?tags=featured', '?platforms=Shopify', '?technologies=React.js,Shopify']) {
      await test.step(q, async () => {
        const html = await (await request.get(`/work${q}`)).text();
        expect.soft(html, `${q}: noindex in server HTML`).toMatch(/name="robots" content="[^"]*noindex/);
        expect.soft(html, `${q}: canonical must be absent`).not.toMatch(/rel="canonical"/);
      });
    }
    const p2 = await (await request.get('/work?page=2')).text();
    test.info().annotations.push({ type: '?page=2', description: `noindex=${/noindex/.test(p2)} canonical=${/rel="canonical"/.test(p2)} (confirm with SEO)` });
  });

  test(qase(25302, "Work — filter links have rel='nofollow' (cards + footer), normal links don't"), async ({ page }) => {
    for (const path of ['/work', '/work/aftersell']) {
      await test.step(path, async () => {
        await page.goto(path);
        const bad = await page.locator('a[href*="/work?"]').evaluateAll((as) => as.filter((a) => !(a.getAttribute('rel') ?? '').includes('nofollow')).map((a) => `${a.textContent?.trim()} ${a.getAttribute('href')}`));
        expect.soft(bad, `${path}: filter links without nofollow`).toEqual([]);
        const normal = await page.locator('a[href^="/work/"], header a').evaluateAll((as) => as.filter((a) => (a.getAttribute('rel') ?? '').includes('nofollow')).map((a) => a.getAttribute('href')));
        expect.soft(normal, `${path}: crawlable links with nofollow`).toEqual([]);
      });
    }
    await test.step('footer params casing consistent with card params', async () => {
      await page.goto('/');
      const params = await page.locator('footer a[href*="/work?"]').evaluateAll((as) => as.map((a) => new URL(a.getAttribute('href')!, location.origin).searchParams.keys().next().value));
      expect.soft(params.filter((p) => p !== p?.toLowerCase() || /\+/.test(p ?? '')), 'non-canonical param names (Tags, System+types)').toEqual([]);
    });
  });
});
