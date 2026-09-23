import { test as base, expect, type Page } from '@playwright/test';
import { CookieBanner } from './pom/CookieBanner';
import { Header } from './pom/Header';
import { MobileMenu } from './pom/MobileMenu';
import { Footer } from './pom/Footer';
import { Modals } from './pom/Modals';

export type ConsentMode = 'decline' | 'accept' | 'none';

type Fixtures = {
  /**
   * How the cookie banner is handled automatically.
   * 'decline' (default) / 'accept' — banner is dismissed whenever it appears (addLocatorHandler).
   * 'none' — banner is left alone (cookie-consent tests).
   */
  consent: ConsentMode;
  /** Auto-close "Got a project? / Need help with an app?" routing modal on /contact and /support */
  autoCloseRoutingModal: boolean;
  /** JS errors (pageerror) collected during the test */
  jsErrors: string[];
  cookieBanner: CookieBanner;
  header: Header;
  mobileMenu: MobileMenu;
  footer: Footer;
  modals: Modals;
};

export const test = base.extend<Fixtures>({
  consent: ['decline', { option: true }],
  autoCloseRoutingModal: [true, { option: true }],

  page: async ({ page, consent, autoCloseRoutingModal }, use) => {
    if (consent !== 'none') {
      const btn = page.locator(consent === 'accept' ? '#accept' : '#decline');
      await page.addLocatorHandler(btn, async (b) => { await b.click(); }, { noWaitAfter: true });
    }
    if (autoCloseRoutingModal) {
      const stay = page.getByRole('button', { name: 'Stay here', exact: true });
      await page.addLocatorHandler(stay, async (b) => { await b.click(); }, { noWaitAfter: true });
    }
    await use(page);
  },

  jsErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await use(errors);
  },

  cookieBanner: async ({ page }, use) => use(new CookieBanner(page)),
  header: async ({ page }, use) => use(new Header(page)),
  mobileMenu: async ({ page }, use) => use(new MobileMenu(page)),
  footer: async ({ page }, use) => use(new Footer(page)),
  modals: async ({ page }, use) => use(new Modals(page)),
});

export { expect };
export type { Page };
