import type { Locator, Page } from '@playwright/test';

/**
 * Desktop header. The site sets aria-labels on nav items ("link to Shopify page",
 * "open Products menu"), so accessible names differ from visible text — href/aria-label based locators.
 */
export class Header {
  readonly root: Locator;
  readonly logo: Locator;
  readonly shopify: Locator;
  readonly work: Locator;
  readonly caseStudies: Locator;
  readonly productsButton: Locator;
  readonly contactsButton: Locator;
  readonly bookACall: Locator;
  readonly marketBadge: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('header').first();
    this.logo = this.root.locator('a[href="/"]').first();
    this.shopify = this.root.locator('a[href="/shopify"]').first();
    this.work = this.root.locator('a[href="/work"]').first();
    this.caseStudies = this.root.locator('a[href="/case-studies"]').first();
    this.productsButton = page.getByRole('button', { name: 'open Products menu' });
    this.contactsButton = page.getByRole('button', { name: 'open Contacts menu' });
    this.bookACall = this.root.getByRole('button', { name: 'open book a call modal button' });
    this.marketBadge = this.root.getByText(/^MADE IN /i).first();
  }

  /** Links inside the opened Products / Contacts dropdown (rendered in header area). */
  dropdownLink(name: string | RegExp): Locator {
    return this.page.getByRole('link', { name }).filter({ visible: true }).first();
  }
  dropdownButton(name: string | RegExp): Locator {
    return this.page.getByRole('button', { name }).filter({ visible: true }).first();
  }
}
