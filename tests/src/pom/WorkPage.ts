import type { Locator, Page } from '@playwright/test';

export class WorkPage {
  readonly search: Locator;
  readonly clearSearch: Locator;
  readonly marketsButton: Locator;
  readonly filtersButton: Locator;
  readonly counter: Locator;
  readonly clearAll: Locator;
  readonly projectCards: Locator;
  readonly noResults: Locator;

  constructor(private readonly page: Page) {
    this.search = page.getByPlaceholder('Write what projects you are interested in...');
    this.clearSearch = page.getByRole('button', { name: 'clear search button' });
    this.marketsButton = page.getByRole('button', { name: 'Open markets menu' });
    this.filtersButton = page.getByRole('button', { name: 'Open search options' });
    this.counter = page.getByText(/Showing \d+ projects out of \d+/);
    this.clearAll = page.getByRole('button', { name: 'Clear all' });
    this.projectCards = page.locator('main h3').filter({ visible: true });
    this.noResults = page.getByText('No projects were found');
  }

  async open(query = ''): Promise<void> {
    await this.page.goto(`/work${query}`);
  }
  async counts(): Promise<{ shown: number; total: number }> {
    const t = await this.counter.innerText();
    const m = t.match(/Showing (\d+) projects out of (\d+)/)!;
    return { shown: Number(m[1]), total: Number(m[2]) };
  }
  filterCategory(name: string): Locator {
    return this.page.locator('main button').filter({ hasText: new RegExp(`^${name}$`) }).first();
  }
  filterOption(title: string): Locator {
    return this.page.locator(`main button[title="${title}"]`).first();
  }
  searchResult(text: string): Locator {
    return this.page.getByRole('button', { name: text, exact: true }).filter({ visible: true }).first();
  }
  section(id: string): Locator {
    return this.page.locator(`section#${id}`);
  }
}
