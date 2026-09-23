import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { PAGES } from '../../src/pages';
import { abs, jsonLdTypes, readHeadSeo } from '../../src/helpers';

/**
 * Qase: "HTML SEO meta tags — <Page>", "<Page> — page has correct <title>...", "meta description from Strapi",
 * "OG tags ... opengraph.xyz", "JSON-LD structured data", "canonical URL matches current page".
 * All steps use expect.soft -> one run shows every SEO gap of a page.
 */
for (const p of PAGES) {
  test.describe(`SEO — ${p.name}`, () => {
    if (p.qase.meta) {
      test(qase(p.qase.meta, `HTML SEO meta tags — ${p.name}`), async ({ page }) => {
        const res = await page.goto(p.path);
        expect(res?.status()).toBe(200);
        const seo = await readHeadSeo(page);

        await test.step(qase.step('<title>', 'Present, 10–70 chars (target 50–60), no null/undefined'), async () => {
          expect.soft(seo.title.trim().length, `title "${seo.title}"`).toBeGreaterThanOrEqual(10);
          expect.soft(seo.title.length, `title "${seo.title}" too long`).toBeLessThanOrEqual(70);
          expect.soft(seo.title).not.toMatch(/undefined|null/);
        });
        await test.step(qase.step('meta description', 'Present, 50–160 chars'), async () => {
          expect.soft(seo.description, 'meta description missing').toBeTruthy();
          expect.soft(seo.description?.length ?? 0, `description "${seo.description}"`).toBeGreaterThanOrEqual(50);
          expect.soft(seo.description?.length ?? 0, 'description > 160 chars').toBeLessThanOrEqual(160);
        });
        await test.step(qase.step('meta robots', 'Page is indexable (no noindex)'), async () => {
          expect.soft(seo.robots ?? '').not.toMatch(/noindex/i);
        });
        await test.step(qase.step('canonical', 'Equals current page URL'), async () => {
          expect.soft(seo.canonical).toBe(abs(p.path));
        });
        await test.step(qase.step('Open Graph', 'og:title, og:description, og:image, og:url present; og:url = page URL'), async () => {
          for (const k of ['og:title', 'og:description', 'og:image', 'og:url']) expect.soft(seo.og[k], `${k} missing`).toBeTruthy();
          expect.soft(seo.og['og:url']).toBe(abs(p.path));
        });
        await test.step(qase.step('twitter:card / viewport / lang', 'summary_large_image|summary; width=device-width; lang=en'), async () => {
          expect.soft(seo.twitterCard).toMatch(/^summary(_large_image)?$/);
          expect.soft(seo.viewport).toMatch(/width=device-width/);
          expect.soft(seo.lang).toMatch(/^(en|uk)/);
        });
        await test.step(qase.step('H1', 'Exactly one non-empty H1'), async () => {
          expect.soft(seo.h1.length, `H1 list: ${JSON.stringify(seo.h1)}`).toBe(1);
          expect.soft(seo.h1[0] ?? '').not.toBe('');
        });
        await test.step(qase.step('img alt / head values', 'No <img> without alt; no "undefined"/"null" in head'), async () => {
          expect.soft(seo.imgsWithoutAlt).toBe(0);
          expect.soft(seo.headHasUndefined, 'head contains "undefined"/"null"').toBe(false);
        });
      });
    }

    if (p.qase.metaDesc) {
      test(qase(p.qase.metaDesc, `${p.name} — meta description from Strapi SEO field`), async ({ page }) => {
        await page.goto(p.path);
        const { description } = await readHeadSeo(page);
        expect(description).toBeTruthy();
        expect(description!.length).toBeGreaterThanOrEqual(50);
        expect(description!.length).toBeLessThanOrEqual(160);
        expect(description).not.toMatch(/undefined|null|lorem/i);
      });
    }

    if (p.qase.og) {
      test(qase(p.qase.og, `${p.name} — OG tags and og:image`), async ({ page, request }) => {
        await page.goto(p.path);
        const { og } = await readHeadSeo(page);
        for (const k of ['og:title', 'og:description', 'og:image', 'og:url']) expect.soft(og[k], `${k} missing`).toBeTruthy();
        expect.soft(og['og:url']).toBe(abs(p.path));
        const img = await request.get(og['og:image']);
        expect(img.status(), 'og:image must load').toBe(200);
        expect(img.headers()['content-type']).toMatch(/^image\//);
      });
    }

    if (p.qase.jsonld) {
      test(qase(p.qase.jsonld, `SEO — JSON-LD structured data present and valid on ${p.path}`), async ({ page }) => {
        await page.goto(p.path);
        const seo = await readHeadSeo(page);
        expect(seo.jsonLdErrors, 'invalid JSON in ld+json').toBe(0);
        expect(seo.jsonLd.length, 'no JSON-LD blocks').toBeGreaterThan(0);
        const types = jsonLdTypes(seo.jsonLd);
        for (const item of seo.jsonLd) {
          const ctx = String((item as Record<string, unknown>)['@context'] ?? 'https://schema.org');
          expect.soft(ctx).toMatch(/schema\.org/);
        }
        if (p.jsonLdType) {
          expect.soft(types.some((t) => p.jsonLdType!.includes(t)), `page-specific @type (${p.jsonLdType.join('|')}) expected, got ${types.join(', ')}`).toBe(true);
        }
        expect.soft(seo.jsonLd.some((i) => (i as Record<string, unknown>).name), 'no JSON-LD entity has "name"').toBe(true);
      });
    }

    if (p.qase.canonical) {
      test(qase(p.qase.canonical, `${p.name} — canonical URL matches current page`), async ({ page }) => {
        await page.goto(p.path);
        await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', abs(p.path));
        await test.step('canonical ignores tracking params', async () => {
          await page.goto(`${p.path}?utm_source=qa-test`);
          await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', abs(p.path));
        });
      });
    }
  });
}

test(qase(25249, 'Homepage — canonical URL is set to the root domain'), async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', abs('/'));
  await page.goto('/?utm_source=test');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', abs('/'));
});
