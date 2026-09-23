import type { Locator, Page } from '@playwright/test';

/**
 * Site cookie banner (bottom) + Cloudflare Zaraz consent modal ("Cookie preferences").
 * Banner container is hidden with visibility:hidden after a choice -> toBeVisible() works.
 * Zaraz modal lives in an OPEN shadow root (Playwright pierces it) and is localized by browser locale.
 */
export class CookieBanner {
  readonly banner: Locator;
  readonly acceptButton: Locator;
  readonly declineButton: Locator;
  readonly preferencesButton: Locator;
  // Zaraz consent modal
  readonly zarazModal: Locator;
  readonly zarazAcceptAll: Locator;
  readonly zarazRejectAll: Locator;
  readonly zarazSave: Locator;
  readonly zarazCheckboxes: Locator;

  constructor(private readonly page: Page) {
    this.banner = page.locator('[class*="cookieBanner_cookie_banner_box"]');
    this.acceptButton = page.locator('#accept');
    this.declineButton = page.locator('#decline');
    this.preferencesButton = page.locator('[class*="cookieBanner_pref_btn"]');
    this.zarazModal = page.locator('dialog.cf_modal');
    this.zarazAcceptAll = page.locator('#cf_consent-buttons__accept-all');
    this.zarazRejectAll = page.locator('#cf_consent-buttons__reject-all');
    this.zarazSave = page.locator('#cf_consent-buttons__save');
    this.zarazCheckboxes = page.locator('dialog.cf_modal input[type="checkbox"]');
  }

  /** Parsed zaraz-consent cookie: { purposeId: boolean } */
  async consentValue(): Promise<Record<string, boolean> | null> {
    const c = (await this.page.context().cookies()).find((x) => x.name === 'zaraz-consent');
    if (!c) return null;
    try { return JSON.parse(decodeURIComponent(c.value)); } catch { return null; }
  }

  async cookieNames(): Promise<string[]> {
    return (await this.page.context().cookies()).map((c) => c.name);
  }
}
