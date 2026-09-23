import { expect, type Page, type APIRequestContext, type Response } from '@playwright/test';

export const BASE = process.env.BASE_URL ?? 'https://devit.group';
export const abs = (path: string) => new URL(path, BASE).toString();

/** Third-party hosts whose console errors / failed requests are not the site's fault. */
const THIRD_PARTY = /google|gstatic|doubleclick|facebook|hotjar|clarity|crisp|pipedrive|leadbooster|calendly|clutch|goodfirms|cloudflareinsights|zaraz|youtube|vimeo|linkedin|licdn|twitter|x\.com|hubspot|sentry/i;

/** Scroll the whole page step by step so lazy sections / images load. */
export async function scrollThrough(page: Page, step = 700, pauseMs = 150): Promise<void> {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += step) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(pauseMs); // lazy-load needs real time between scroll steps
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

/** No horizontal page scroll (1px tolerance for sub-pixel rounding). */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, `Horizontal overflow: scrollWidth ${scrollWidth} > viewport ${clientWidth}`).toBeLessThanOrEqual(clientWidth + 1);
}

/** Images that finished loading with naturalWidth 0 (broken). Call after scrollThrough(). */
export async function brokenImages(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.images]
      .filter((img) => img.complete && img.currentSrc && img.naturalWidth === 0 && img.loading !== 'lazy')
      .map((img) => img.currentSrc),
  );
}

/** Collect failed (>=400 or network-failed) first-party requests for css/js/font/image. */
export function trackFailedRequests(page: Page): string[] {
  const failed: string[] = [];
  const isOwn = (url: string) => /devit\.group|cdn\.devit/.test(url) && !THIRD_PARTY.test(url);
  page.on('response', (r: Response) => {
    const type = r.request().resourceType();
    if (r.status() >= 400 && isOwn(r.url()) && ['stylesheet', 'script', 'font', 'image', 'document'].includes(type)) {
      failed.push(`${r.status()} ${type} ${r.url()}`);
    }
  });
  page.on('requestfailed', (req) => {
    const err = req.failure()?.errorText ?? '';
    if (isOwn(req.url()) && !/ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(err)) failed.push(`FAILED ${req.resourceType()} ${req.url()} ${err}`);
  });
  return failed;
}

/** Filter out JS errors thrown by third-party scripts. */
export const ownErrors = (errors: string[]) => errors.filter((e) => !THIRD_PARTY.test(e));

/** Visible placeholder / template garbage in the rendered text. */
export async function placeholderTokens(page: Page): Promise<string[]> {
  const text = await page.locator('main').innerText().catch(() => page.locator('body').innerText());
  const bad = [/lorem ipsum/i, /\bundefined\b/, /\bNaN\b/, /\{\{.+?\}\}/, /\[object Object\]/];
  return bad.filter((rx) => rx.test(text)).map(String);
}

export type HeadSeo = {
  title: string; description: string | null; robots: string | null; canonical: string | null;
  og: Record<string, string>; twitterCard: string | null; viewport: string | null; lang: string;
  h1: string[]; imgsWithoutAlt: number; jsonLd: unknown[]; jsonLdErrors: number; headHasUndefined: boolean;
};

export async function readHeadSeo(page: Page): Promise<HeadSeo> {
  return page.evaluate(() => {
    const meta = (sel: string) => document.querySelector<HTMLMetaElement>(sel)?.content ?? null;
    const og: Record<string, string> = {};
    document.querySelectorAll<HTMLMetaElement>('meta[property^="og:"]').forEach((m) => { og[m.getAttribute('property')!] = m.content; });
    const jsonLd: unknown[] = []; let jsonLdErrors = 0;
    document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
      try { const j = JSON.parse(s.textContent ?? ''); jsonLd.push(...(Array.isArray(j) ? j : j['@graph'] ?? [j])); } catch { jsonLdErrors++; }
    });
    const headValues = [...document.head.querySelectorAll('meta,title,link')].map((e) => (e as HTMLMetaElement).content ?? e.textContent ?? '').join(' ');
    return {
      title: document.title,
      description: meta('meta[name="description"]'),
      robots: meta('meta[name="robots"]'),
      canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? null,
      og,
      twitterCard: meta('meta[name="twitter:card"]'),
      viewport: meta('meta[name="viewport"]'),
      lang: document.documentElement.lang,
      h1: [...document.querySelectorAll('h1')].map((h) => (h.textContent ?? '').trim()),
      imgsWithoutAlt: document.querySelectorAll('img:not([alt])').length,
      jsonLd,
      jsonLdErrors,
      headHasUndefined: /\bundefined\b|\bnull\b/.test(headValues),
    };
  });
}

export const jsonLdTypes = (items: unknown[]): string[] =>
  items.flatMap((i) => {
    const t = (i as Record<string, unknown>)['@type'];
    return Array.isArray(t) ? t.map(String) : t ? [String(t)] : [];
  });

/** Raw server HTML (no JS) — SSR checks. */
export async function serverHtml(request: APIRequestContext, path: string): Promise<{ status: number; html: string; headers: Record<string, string> }> {
  const res = await request.get(path, { maxRedirects: 0 });
  return { status: res.status(), html: await res.text(), headers: res.headers() };
}

/** Click that opens a new tab; returns the popup page after DOM is ready. */
export async function clickAndGetPopup(page: Page, click: () => Promise<void>): Promise<Page> {
  const popupPromise = page.context().waitForEvent('page');
  await click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded').catch(() => undefined);
  return popup;
}

/** Status of a URL without following redirects too far (HEAD falls back to GET). */
export async function urlStatus(request: APIRequestContext, url: string): Promise<number> {
  const res = await request.get(url, { maxRedirects: 5, failOnStatusCode: false, timeout: 20_000 }).catch(() => null);
  return res?.status() ?? 0;
}

/** Parse <loc> from a sitemap XML. */
export const sitemapLocs = (xml: string) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
