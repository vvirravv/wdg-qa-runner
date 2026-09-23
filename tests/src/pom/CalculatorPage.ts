import type { Locator, Page } from '@playwright/test';

/**
 * /calculator — 5 steps. Steps 1-2: combobox (role=combobox + role=option), steps 3-5: radio inputs.
 * State is mirrored into the URL: ?step=2&industry=85&systemType=34&platform=11&complexity=...&audienceType=...
 */
export class CalculatorPage {
  readonly progress: Locator;
  readonly next: Locator;
  readonly back: Locator;
  readonly combobox: Locator;
  readonly radios: Locator;
  readonly summary: Locator;
  readonly costRange: Locator;

  constructor(private readonly page: Page) {
    this.progress = page.getByText(/^Question \d of 5$/);
    this.next = page.getByRole('button', { name: 'Calculator next button' });
    this.back = page.getByRole('button', { name: 'Calculator back button' });
    this.combobox = page.locator('main [role="combobox"]').first();
    this.radios = page.locator('main input[type="radio"]');
    this.summary = page.getByText('Summary', { exact: true }).locator('xpath=..');
    this.costRange = page.getByText(/\$\d+k\s*-\s*\$\d+k/);
  }

  async open(): Promise<void> { await this.page.goto('/calculator'); }

  async step(): Promise<number> {
    return Number((await this.progress.innerText()).match(/Question (\d)/)![1]);
  }

  /** Select first (or given) option on the current step. Returns the chosen label. */
  async answer(index = 0): Promise<string> {
    if (await this.combobox.isVisible().catch(() => false)) {
      await this.combobox.click();
      const opt = this.page.getByRole('option').nth(index);
      const label = (await opt.innerText()).trim();
      await opt.click();
      return label;
    }
    const radio = this.radios.nth(index);
    const label = (await radio.locator('xpath=following::label[1]').innerText()).trim();
    await radio.check({ force: true });
    return label;
  }

  async completeAll(): Promise<string[]> {
    const answers: string[] = [];
    for (let i = 0; i < 5; i++) {
      answers.push(await this.answer());
      await this.next.click();
    }
    return answers;
  }
}
