import type { FrameLocator, Locator, Page } from '@playwright/test';

/**
 * Modals shared across the site.
 *  - Pipedrive web forms ("Ready for cooperation?" / "Request Our Company Overview") are cross-origin iframes.
 *  - "Book a call" opens Calendly — blocked by a "Functional Cookies are disabled" popup until consent is given.
 * NEVER submit Pipedrive forms with valid data on production (creates real leads).
 */
export class Modals {
  constructor(private readonly page: Page) {}

  /** The currently visible Pipedrive form iframe */
  get pipedriveIframe(): Locator {
    return this.page.locator('iframe[src*="webforms.pipedrive.com"]').filter({ visible: true }).first();
  }
  get pipedrive(): FrameLocator {
    return this.pipedriveIframe.contentFrame();
  }
  field(label: string | RegExp): Locator {
    return this.pipedrive.getByLabel(label).first();
  }
  get submit(): Locator {
    return this.pipedrive.locator('button[type="submit"]').first();
  }
  get requiredError(): Locator {
    return this.pipedrive.getByText('This field is required').first();
  }
  get emailError(): Locator {
    return this.pipedrive.getByText(/valid email/i).first();
  }

  /** "Functional Cookies are disabled..." popup (Book a call / chat without consent) */
  get functionalCookiesPopup(): Locator {
    return this.page.getByText(/Functional Cookies are disabled/i).filter({ visible: true }).first();
  }
  get functionalCookiesAccept(): Locator {
    return this.page.getByRole('button', { name: 'enable popup btn' }).filter({ visible: true }).first();
  }
  get functionalCookiesCancel(): Locator {
    return this.page.getByRole('button', { name: 'close popup btn' }).filter({ visible: true }).first();
  }

  get calendlyIframe(): Locator {
    return this.page.locator('iframe[src*="calendly.com"]').filter({ visible: true }).first();
  }

  /** Any visible modal close (X) button */
  get closeButton(): Locator {
    return this.page.getByRole('button', { name: 'close button' }).filter({ visible: true }).last();
  }

  /** Live chat widgets: Crisp (DevIT Software support) and Pipedrive LeadBooster (Agency) */
  get anyChatWidget(): Locator {
    return this.page.locator('#crisp-chatbox [data-chat-status], #crisp-chatbox-chat, #LeadboosterContainer iframe, iframe[src*="leadbooster"], [data-id="crisp-chatbox"]').filter({ visible: true }).first();
  }
}
