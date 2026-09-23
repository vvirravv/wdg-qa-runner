import type { Locator, Page } from '@playwright/test';

export const FOOTER_EXPERTISES = ['Web development', 'Mobile development', 'TV development', 'Bot development', 'UX/UI Design', 'Shopify Development', 'AI', 'Blockchain'];
export const FOOTER_INDUSTRIES = ['E-Commerce', 'Healthcare', 'Media', 'Fintech', 'Social Networks'];
export const FOOTER_COMPANY_INTERNAL: Array<[string, string]> = [['About us', '/about'], ['Portfolio', '/work'], ['Awards', '/awards'], ['Blog', '/blog'], ['Calculator', '/calculator']];
export const FOOTER_COMPANY_EXTERNAL: Array<[string, RegExp]> = [['Careers', /jobs\.devit\.group/], ['Support Ukraine', /u24\.gov\.ua/], ['In-house Software', /devit\.software/]];

export class Footer {
  readonly root: Locator;
  constructor(private readonly page: Page) {
    this.root = page.locator('footer').first();
  }
  /** Footer text links carry aria-label "some topic link" -> locate by visible text. */
  link(text: string): Locator {
    return this.root.locator('a').filter({ hasText: new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}\\s*$`) }).first();
  }
  button(text: string): Locator {
    return this.root.locator('button').filter({ hasText: text }).first();
  }
  heading(text: string): Locator {
    return this.root.getByText(text, { exact: true }).first();
  }
  get socialLinks(): Locator {
    return this.root.locator('a[aria-label="link to social web"]');
  }
  get telLinks(): Locator {
    return this.page.locator('a[href^="tel:"]');
  }
}
