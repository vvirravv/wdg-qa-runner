import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { expectNoHorizontalScroll } from '../../src/helpers';

test.describe('Header & Navigation (desktop)', () => {
  test(qase(25147, 'Header — Logo: visible, links to homepage from any page'), async ({ page, header }) => {
    await page.goto('/work');
    await expect(header.logo).toBeVisible();
    await expect(header.logo).toContainText(/Outsource/i);
    await header.logo.click();
    await expect(page).toHaveURL(/devit\.group\/?$/);
    await test.step('logo on homepage keeps URL at / (SPA, no reload)', async () => {
      await page.evaluate(() => ((window as unknown as { __qaMarker: number }).__qaMarker = 1));
      await header.logo.click();
      await expect(page).toHaveURL(/devit\.group\/?$/);
      expect(await page.evaluate(() => (window as unknown as { __qaMarker?: number }).__qaMarker), 'full page reload happened').toBe(1);
    });
  });

  test(qase(25148, 'Navigation — all menu items present and correctly labelled'), async ({ page, header }) => {
    await page.goto('/');
    await expect(header.shopify).toHaveText('Shopify');
    await expect(header.productsButton).toHaveText(/Products/);
    await expect(header.work).toHaveText('Work');
    await expect(header.caseStudies).toHaveText('Case studies');
    await expect(header.contactsButton).toHaveText(/Contacts/);
    await expect(header.bookACall).toHaveText(/Book a call/);
  });

  test(qase(25149, 'Navigation — all menu items open correct pages, dropdowns work'), async ({ page, header }) => {
    const cases: Array<[string, () => Promise<void>, RegExp]> = [
      ['Shopify', () => header.shopify.click(), /\/shopify$/],
      ['Work', () => header.work.click(), /\/work$/],
      ['Case studies', () => header.caseStudies.click(), /\/case-studies$/],
      ['Products → ReSell', async () => { await header.productsButton.click(); await page.locator('a[href="/resell"]').filter({ visible: true }).first().click(); }, /\/resell$/],
      ['Products → React Flow', async () => { await header.productsButton.click(); await page.locator('a[href="/react-flow"]').filter({ visible: true }).first().click(); }, /\/react-flow$/],
      ['Contacts → Agency contact', async () => { await header.contactsButton.click(); await page.locator('a[href="/contact"]').filter({ visible: true }).first().click(); }, /\/contact$/],
      ['Contacts → Support', async () => { await header.contactsButton.click(); await page.locator('a[href="/support"]').filter({ visible: true }).first().click(); }, /\/support$/],
    ];
    for (const [name, act, url] of cases) {
      await test.step(name, async () => {
        await page.goto('/');
        await act();
        await expect(page).toHaveURL(url);
        await expect(page.locator('main')).toBeVisible();
      });
    }
  });

  test(qase(25150, 'Navigation — Products dropdown: all items present and act correctly'), async ({ page, header }) => {
    await page.goto('/');
    await header.productsButton.click();
    await expect(header.productsButton).toHaveAttribute('aria-expanded', 'true');
    const items: Array<[string, string, boolean]> = [
      // [description, href selector, opens in new tab]
      ['ReSell', 'a[href="/resell"]', false],
      ['React Flow', 'a[href="/react-flow"]', false],
      ['Selecty', 'a[href*="apps.shopify.com/selectors"]', true],
      ['Lably', 'a[href*="apps.shopify.com/lably"]', true],
      ['ShopCart', 'a[href*="apps.shopify.com/shopcart"]', true],
      ['Huddles', 'a[href*="/work/discord-huddles-bot"]', true],
      ['Email', 'a[href*="/work/discord-email-bot"]', true],
      ['Telegram', 'a[href*="/work/discord-telegram-bot"]', true],
      ['Help center', 'a[href^="https://help.devit.software"]', true],
    ];
    for (const [name, sel, blank] of items) {
      await test.step(`${name} link present${blank ? ' (new tab)' : ''}`, async () => {
        const link = page.locator(sel).filter({ visible: true }).first();
        await expect.soft(link, `${name} missing in Products dropdown`).toBeVisible();
        if (blank) await expect.soft(link).toHaveAttribute('target', '_blank');
      });
    }
    await expect.soft(page.getByRole('button', { name: /Not sure which product fits/ }).filter({ visible: true })).toBeVisible();
    await expect.soft(page.getByRole('button', { name: /Need help with your app/ }).filter({ visible: true })).toBeVisible();

    await test.step('Mouse away closes dropdown', async () => {
      await page.mouse.move(700, 700);
      await page.mouse.click(700, 700);
      await expect(header.productsButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  test(qase(25151, "Navigation — 'Book a call' button opens form/modal"), async ({ page, header, modals }) => {
    await page.goto('/');
    await header.bookACall.click();
    // without functional-cookie consent the site shows a consent popup; with consent — Calendly iframe
    await expect(modals.functionalCookiesPopup.or(modals.calendlyIframe)).toBeVisible();
  });

  test(qase(25152, 'Navigation — hover effects on all menu items'), async ({ page, header }) => {
    await page.goto('/');
    for (const [name, loc] of [['Shopify', header.shopify], ['Work', header.work], ['Case studies', header.caseStudies], ['Book a call', header.bookACall]] as const) {
      await test.step(name, async () => {
        await page.mouse.move(0, 400);
        const style = () => loc.evaluate((e) => { const s = getComputedStyle(e); return `${s.color}|${s.backgroundColor}|${s.textDecorationLine}|${s.borderColor}|${s.opacity}`; });
        const before = await style();
        await loc.hover();
        await page.waitForTimeout(400); // CSS transition
        expect.soft(await style(), `${name}: no visual change on hover`).not.toBe(before);
      });
    }
  });

  test(qase(25153, 'Navigation — active state on current page menu item'), async ({ page, header }) => {
    const color = (l: typeof header.work) => l.evaluate((e) => `${getComputedStyle(e).color}|${getComputedStyle(e).fontWeight}|${e.getAttribute('aria-current')}|${e.className}`);
    await page.goto('/work');
    expect.soft(await color(header.work), 'Work item not highlighted on /work').not.toBe(await color(header.caseStudies));
    await page.goto('/shopify');
    expect.soft(await color(header.shopify), 'Shopify item not highlighted on /shopify').not.toBe(await color(header.caseStudies));
  });

  test(qase(25154, 'Navigation — sticky header stays visible on scroll'), async ({ page, header }) => {
    await page.goto('/');
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(500);
    await expect(header.root).toBeInViewport();
    await page.keyboard.press('End');
    await page.waitForTimeout(800);
    await expect(header.root).toBeInViewport();
    const box = await header.root.boundingBox();
    expect(box!.y).toBeLessThanOrEqual(1);
  });

  test(qase(25155, 'Navigation — no horizontal scrollbar at 1440px'), async ({ page }) => {
    for (const path of ['/', '/work', '/shopify', '/contact']) {
      await test.step(path, async () => {
        await page.goto(path);
        await expectNoHorizontalScroll(page);
      });
    }
  });

  test(qase(25156, 'Navigation — Contacts dropdown: Support → /support, Agency contact → /contact'), async ({ page, header }) => {
    await page.goto('/');
    await header.contactsButton.click();
    const support = page.locator('a[href="/support"]').filter({ visible: true }).first();
    const agency = page.locator('a[href="/contact"]').filter({ visible: true }).first();
    await expect(support).toContainText(/Support for customers using our products/i);
    await expect(agency).toContainText(/Agency contact/i);
    await expect(agency).toContainText(/For new and existing outsourcing clients/i);
    await expect.soft(support, "label per TC is 'Product support'").toContainText(/Product support/i);
    await support.click();
    await expect(page).toHaveURL(/\/support$/);
    await page.goto('/');
    await header.contactsButton.click();
    await page.locator('a[href="/contact"]').filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/contact$/);
  });
});
