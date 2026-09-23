import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { PAGES } from '../../src/pages';
import { abs, serverHtml, sitemapLocs } from '../../src/helpers';

async function allSitemapUrls(request: import('@playwright/test').APIRequestContext): Promise<{ urls: string[]; xmls: string[] }> {
  const root = await (await request.get('/sitemap.xml')).text();
  const xmls = [root];
  let urls = sitemapLocs(root);
  if (/<sitemapindex/i.test(root)) {
    const children = urls; urls = [];
    for (const c of children) { const x = await (await request.get(c)).text(); xmls.push(x); urls.push(...sitemapLocs(x)); }
  }
  return { urls, xmls };
}

test.describe('Global — SEO & Technical', () => {
  test(qase(25220, 'AI Agent Readiness — llms.txt and AI crawler rules (partial; isitagentready.com manual)'), async ({ request }) => {
    const llms = await request.get('/llms.txt');
    expect.soft(llms.status(), '/llms.txt').toBe(200);
    if (llms.ok()) expect.soft((await llms.text()).trim().length).toBeGreaterThan(50);
    const robots = await (await request.get('/robots.txt')).text();
    const bots = ['GPTBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', 'Google-Extended'];
    test.info().annotations.push({ type: 'ai-bots-in-robots', description: bots.map((b) => `${b}:${robots.includes(b) ? 'mentioned' : 'default rules'}`).join(', ') });
    for (const b of bots) {
      const block = new RegExp(`User-agent:\\s*${b}[\\s\\S]*?Disallow:\\s*/\\s*$`, 'mi');
      expect.soft(block.test(robots), `${b} fully blocked`).toBe(false);
    }
  });

  test(qase(25221, 'H1 — every page has exactly one full, non-truncated H1 (server HTML + DOM)'), async ({ page, request }) => {
    for (const p of PAGES) {
      await test.step(p.path, async () => {
        const { html } = await serverHtml(request, p.path);
        const ssrH1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
        expect.soft(ssrH1.length, `${p.path}: H1 in server HTML ${JSON.stringify(ssrH1)}`).toBe(1);
        await page.goto(p.path);
        const h1 = page.locator('h1');
        expect.soft(await h1.count(), `${p.path}: H1 count in DOM`).toBe(1);
        if (await h1.count()) {
          if (p.h1) await expect.soft(h1.first()).toHaveText(p.h1);
          const clipped = await h1.first().evaluate((e) => {
            const s = getComputedStyle(e);
            return s.textOverflow === 'ellipsis' || s.webkitLineClamp !== 'none' || e.scrollHeight > e.clientHeight + 2 && s.overflow === 'hidden';
          });
          expect.soft(clipped, `${p.path}: H1 visually truncated`).toBe(false);
          expect.soft((await h1.first().innerText()).trim()).not.toMatch(/…$|\.\.\.$/);
        }
      });
    }
  });
});

test.describe('sitemap.xml', () => {
  test(qase(25222, 'sitemap.xml — HTTP 200 and Content-Type'), async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/(application|text)\/xml/);
    expect((await res.text()).length).toBeGreaterThan(100);
  });

  test(qase(25223, 'sitemap.xml — valid XML structure (partial: local structural validation)'), async ({ request }) => {
    const { xmls, urls } = await allSitemapUrls(request);
    for (const x of xmls) {
      expect(x.trim().startsWith('<?xml') || /^<(urlset|sitemapindex)/.test(x.trim())).toBe(true);
      expect(x).toMatch(/<(urlset|sitemapindex)[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
      const open = (x.match(/<url>/g) ?? []).length; const close = (x.match(/<\/url>/g) ?? []).length;
      expect(open).toBe(close);
    }
    expect(urls.length).toBeGreaterThan(10);
    expect(urls.every((u) => u.startsWith('https://devit.group'))).toBe(true);
  });

  test(qase(25224, 'sitemap.xml — URL count reflects published content (partial)'), async ({ request }) => {
    const { urls } = await allSitemapUrls(request);
    const paths = urls.map((u) => new URL(u).pathname.replace(/\/$/, '') || '/');
    for (const p of ['/shopify', '/work', '/resell', '/react-flow', '/about', '/contact', '/calculator', '/blog', '/awards', '/case-studies', '/support']) {
      expect.soft(paths, `static page ${p} missing in sitemap`).toContain(p);
    }
    const work = paths.filter((p) => /^\/work\/.+/.test(p)).length;
    const blog = paths.filter((p) => /^\/blog\/.+/.test(p)).length;
    test.info().annotations.push({ type: 'counts', description: `total=${urls.length}, work=${work}, blog=${blog}` });
    const minTotal = Number(process.env.SITEMAP_MIN_URLS ?? 0);
    expect(urls.length, 'total URLs dropped below the last known count (SITEMAP_MIN_URLS)').toBeGreaterThanOrEqual(minTotal);
    // compare with the portfolio counter: "Showing N projects out of TOTAL"
    const html = await (await request.get('/work')).text();
    const total = Number(html.match(/out of (\d+)/)?.[1] ?? 0);
    if (total) expect.soft(work, `sitemap /work/* (${work}) vs portfolio total (${total})`).toBeGreaterThanOrEqual(total - 5);
  });

  test(qase(25225, 'sitemap.xml — every listed URL returns HTTP 200'), async ({ request }) => {
    test.setTimeout(10 * 60_000);
    const { urls } = await allSitemapUrls(request);
    const bad: string[] = [];
    const queue = [...urls];
    await Promise.all(Array.from({ length: 6 }, async () => {
      for (let u = queue.shift(); u; u = queue.shift()) {
        const r = await request.get(u, { maxRedirects: 0, failOnStatusCode: false }).catch(() => null);
        if (!r || r.status() !== 200) bad.push(`${r?.status() ?? 'ERR'} ${u}`);
      }
    }));
    expect(bad).toEqual([]);
  });

  test(qase(25226, 'sitemap.xml — <lastmod> present and ISO 8601 / W3C (partial)'), async ({ request }) => {
    const { xmls } = await allSitemapUrls(request);
    const entries = xmls.flatMap((x) => [...x.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]));
    const iso = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/;
    const missing: string[] = []; const badFormat: string[] = []; const dates: string[] = [];
    for (const e of entries) {
      const loc = e.match(/<loc>(.*?)<\/loc>/)?.[1] ?? '?';
      const lm = e.match(/<lastmod>(.*?)<\/lastmod>/)?.[1]?.trim();
      if (!lm) { if (/\/(work|blog)\//.test(loc)) missing.push(loc); continue; }
      if (!iso.test(lm)) badFormat.push(`${loc} ${lm}`);
      dates.push(lm.slice(0, 10));
    }
    expect.soft(missing, '/work/* and /blog/* without <lastmod>').toEqual([]);
    expect.soft(badFormat, 'invalid <lastmod> format').toEqual([]);
    const now = new Date().toISOString().slice(0, 10);
    expect.soft(dates.filter((d) => d > now || d < '2010-01-01'), 'future or unrealistic dates').toEqual([]);
    expect.soft(new Set(dates).size, 'all <lastmod> identical (build timestamp)').toBeGreaterThan(1);
  });

  test(qase(25227, 'sitemap.xml — <changefreq> and <priority> values are valid'), async ({ request }) => {
    const { xmls } = await allSitemapUrls(request);
    const all = xmls.join('\n');
    const freqs = [...all.matchAll(/<changefreq>(.*?)<\/changefreq>/g)].map((m) => m[1].trim());
    const prios = [...all.matchAll(/<priority>(.*?)<\/priority>/g)].map((m) => m[1].trim());
    expect(freqs.filter((f) => !/^(always|hourly|daily|weekly|monthly|yearly|never)$/.test(f))).toEqual([]);
    expect(prios.filter((p) => !(Number(p) >= 0 && Number(p) <= 1) || p === '')).toEqual([]);
  });
});

test.describe('robots.txt', () => {
  test(qase(25228, 'robots.txt — HTTP 200 and Content-Type text/plain'), async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/text\/plain/);
    expect((await res.text()).trim().length).toBeGreaterThan(0);
  });

  test(qase(25229, 'robots.txt — contains Sitemap directive'), async ({ request }) => {
    expect(await (await request.get('/robots.txt')).text()).toMatch(new RegExp(`^Sitemap:\\s*${abs('/sitemap.xml').replace(/[./]/g, '\\$&')}`, 'mi'));
  });

  test(qase(25230, 'robots.txt — key pages are not blocked'), async ({ request }) => {
    const txt = await (await request.get('/robots.txt')).text();
    const groups = txt.split(/(?=^User-agent:)/mi);
    const relevant = groups.filter((g) => /User-agent:\s*(\*|Googlebot)\s*$/mi.test(g));
    const disallows = relevant.flatMap((g) => [...g.matchAll(/^Disallow:\s*(\S*)/gmi)].map((m) => m[1])).filter(Boolean);
    expect(disallows, 'Disallow: / for * or Googlebot').not.toContain('/');
    for (const p of ['/work', '/contact', '/shopify', '/about', '/case-studies']) {
      expect.soft(disallows.filter((d) => p.startsWith(d) && d !== ''), `${p} blocked`).toEqual([]);
    }
  });

  test(qase(25231, 'robots.txt — syntax is valid'), async ({ request }) => {
    const lines = (await (await request.get('/robots.txt')).text()).split(/\r?\n/).map((l) => l.replace(/#.*/, '').trim()).filter(Boolean);
    let hasAgent = false; const seen = new Set<string>(); const problems: string[] = [];
    let group = '';
    for (const l of lines) {
      const [k] = l.split(':');
      const key = k.trim().toLowerCase();
      if (key === 'user-agent') { hasAgent = true; group = l; continue; }
      if (['allow', 'disallow', 'crawl-delay'].includes(key)) {
        if (!hasAgent) problems.push(`orphan: ${l}`);
        const id = `${group}|${l}`; if (seen.has(id)) problems.push(`duplicate: ${l}`); seen.add(id);
      } else if (!['sitemap', 'host', 'content-signal'].includes(key)) problems.push(`unknown directive: ${l}`);
    }
    expect(problems).toEqual([]);
  });
});
