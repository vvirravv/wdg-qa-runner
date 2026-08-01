// @ts-check
const { test, expect } = require('@playwright/test');
const { httpGet, BASE } = require('../../helpers');

// ─── Pages to check ───────────────────────────────────────────────────────────
const PAGES = [
  { path: '/',               name: 'Homepage'       },
  { path: '/work',           name: 'Work'           },
  { path: '/contact',        name: 'Contact'        },
  { path: '/shopify',        name: 'Shopify'        },
  { path: '/about',          name: 'About'          },
  { path: '/calculator',     name: 'Calculator'     },
  { path: '/blog',           name: 'Blog'           },
  { path: '/awards',         name: 'Awards'         },
  { path: '/case-studies',   name: 'Case Studies'   },
  { path: '/privacy-policy', name: 'Privacy Policy' },
  { path: '/cookie-policy',  name: 'Cookie Policy'  },
  { path: '/resell',         name: 'ReSell'         },
  { path: '/react-flow',     name: 'React Flow'     },
  { path: '/support',        name: 'Support'        },
];

// ─── robots.txt & sitemap.xml ─────────────────────────────────────────────────
test.describe('[SEO-00] robots.txt & sitemap.xml', () => {

  test('[S-001] robots.txt accessible and not blocking site', async () => {
    const res = await httpGet('/robots.txt');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('User-agent');
    expect(body).toContain('Sitemap:');
    // Must not block everything
    expect(body).not.toMatch(/^Disallow: \/\s*$/m);
  });

  test('[S-002] sitemap.xml accessible and has ≥100 URLs', async () => {
    const res = await httpGet('/sitemap.xml');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('<urlset');
    const count = (body.match(/<url>/g) || []).length;
    expect(count, `sitemap has only ${count} URLs`).toBeGreaterThanOrEqual(100);
  });

  test('[S-003] sitemap.xml contains all main pages', async () => {
    const res = await httpGet('/sitemap.xml');
    const body = await res.text();
    for (const { path, name } of PAGES) {
      expect(body, `sitemap missing ${name} (${path})`).toContain(`${BASE}${path}`);
    }
  });

});

// ─── Per-page SEO checks ──────────────────────────────────────────────────────
for (const { path, name } of PAGES) {

  test.describe(`[SEO] ${name} (${path})`, () => {

    test(`[S-010] ${name} — <title> 5–70 chars`, async ({ page }) => {
      await page.goto(path);
      const title = await page.title();
      expect(title.length, `title: "${title}"`).toBeGreaterThan(5);
      expect(title.length, `title too long: "${title}"`).toBeLessThanOrEqual(70);
      expect(title.toLowerCase()).not.toContain('undefined');
      expect(title.toLowerCase()).not.toContain('null');
    });

    test(`[S-011] ${name} — meta description 50–160 chars`, async ({ page }) => {
      await page.goto(path);
      const desc = await page.locator('meta[name="description"]').getAttribute('content');
      expect(desc, 'meta description missing').toBeTruthy();
      expect(desc.length, `desc too short: "${desc}"`).toBeGreaterThan(50);
      expect(desc.length, `desc too long: "${desc}"`).toBeLessThanOrEqual(160);
    });

    test(`[S-012] ${name} — exactly one H1`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const h1s = await page.locator('h1').count();
      expect(h1s, `${name} has ${h1s} H1 tags`).toBe(1);
    });

    test(`[S-013] ${name} — canonical tag = own URL`, async ({ page }) => {
      await page.goto(path);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical, 'canonical tag missing').toBeTruthy();
      const expected = `${BASE}${path}`;
      expect(canonical, `canonical mismatch: got "${canonical}"`).toBe(expected);
    });

    test(`[S-014] ${name} — hreflang="en" present`, async ({ page }) => {
      await page.goto(path);
      const hreflang = await page.locator('link[rel="alternate"][hreflang="en"]').getAttribute('href');
      expect(hreflang, 'hreflang="en" tag missing').toBeTruthy();
    });

    test(`[S-015] ${name} — Open Graph title and description`, async ({ page }) => {
      await page.goto(path);
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
      const ogDesc  = await page.locator('meta[property="og:description"]').getAttribute('content');
      expect(ogTitle, 'og:title missing').toBeTruthy();
      expect(ogDesc,  'og:description missing').toBeTruthy();
    });

  });
}
