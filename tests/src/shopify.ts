import type { APIRequestContext } from '@playwright/test';

/** Rating / review count of a Shopify App Store listing (from its JSON-LD aggregateRating). */
export async function shopifyListing(request: APIRequestContext, app: string): Promise<{ rating: number; reviews: number }> {
  const html = await (await request.get(`https://apps.shopify.com/${app}`, { headers: { 'accept-language': 'en' } })).text();
  const rating = Number(html.match(/"ratingValue"\s*:\s*"?([\d.]+)/)?.[1] ?? NaN);
  const reviews = Number(html.match(/"(?:ratingCount|reviewCount)"\s*:\s*"?(\d+)/)?.[1] ?? NaN);
  if (Number.isNaN(rating)) throw new Error(`Cannot read rating for ${app} from apps.shopify.com`);
  return { rating, reviews };
}
