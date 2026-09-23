import type { Locator, Page } from '@playwright/test';

/** Mobile header menu (<= ~1024px). Products/Contacts are <li> items (not buttons) that open a sub-panel. */
export class MobileMenu {
  readonly burger: Locator;
  readonly panel: Locator;
  readonly items: Locator;

  constructor(private readonly page: Page) {
    this.burger = page.getByRole('button', { name: 'burger button' });
    this.panel = page.locator('[class*="mobileMockLinks_mock_links_mobile_list"]');
    this.items = page.locator('[class*="mobileMockLinks_mock_links_mobile_item"]');
  }

  item(name: string): Locator {
    return this.items.filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) }).first();
  }
  link(href: string): Locator {
    return this.page.locator(`a[href="${href}"]`).filter({ visible: true }).first();
  }
  async open(): Promise<void> {
    await this.burger.click();
    await this.panel.waitFor({ state: 'visible' });
  }
}
