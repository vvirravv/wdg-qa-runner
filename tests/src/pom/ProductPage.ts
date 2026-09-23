import type { Locator, Page } from '@playwright/test';

/** Product landing pages /resell and /react-flow share the same components. */
export class ProductPage {
  readonly demoStore: Locator;
  readonly bookDemo: Locator;
  readonly monthly: Locator;
  readonly yearly: Locator;
  readonly volumeSlider: Locator;
  readonly volumeInput: Locator;
  readonly pricing: Locator;
  readonly reviews: Locator;
  readonly faqItems: Locator;
  readonly enterprise: Locator;
  readonly anchorNav: (name: string) => Locator;
  readonly appStoreHeaderLink: Locator;

  constructor(readonly page: Page, readonly slug: 'resell' | 'react-flow') {
    this.demoStore = page.locator('main a').filter({ hasText: 'View demo store' }).first();
    this.bookDemo = page.getByRole('button', { name: 'Book a demo' });
    this.pricing = page.locator('section#pricing');
    this.monthly = this.pricing.getByRole('button', { name: 'Monthly', exact: true });
    this.yearly = this.pricing.getByRole('button', { name: /Yearly/ });
    this.volumeSlider = this.pricing.locator('input[type="range"]');
    this.volumeInput = this.pricing.locator('input[type="number"]');
    this.reviews = page.locator('section#reviews');
    this.faqItems = page.locator('section#contacts button[aria-expanded]');
    this.enterprise = page.getByRole('button', { name: 'open live chat button' }).filter({ hasText: 'Talk to enterprise team' });
    this.anchorNav = (name: string) => page.locator(`header a[href="/${slug}#${name.toLowerCase()}"]`).first();
    this.appStoreHeaderLink = page.locator(`header a[href*="apps.shopify.com/${slug === 'resell' ? 'resell' : 'react-flow'}"]`).first();
  }

  async open(): Promise<void> { await this.page.goto(`/${this.slug}`); }

  /** Visible "$X" prices inside pricing cards */
  async prices(): Promise<string[]> {
    return (await this.pricing.innerText()).match(/\$\s?[\d,.]+/g) ?? [];
  }

  async setVolume(value: number): Promise<void> {
    await this.volumeSlider.evaluate((el: HTMLInputElement, v) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(el, String(v));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  }
}
