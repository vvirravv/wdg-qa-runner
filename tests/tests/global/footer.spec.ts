import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { PAGES } from '../../src/pages';
import { FOOTER_COMPANY_EXTERNAL, FOOTER_COMPANY_INTERNAL, FOOTER_EXPERTISES, FOOTER_INDUSTRIES } from '../../src/pom/Footer';

test.describe('Footer', () => {
  test.beforeEach(async ({ page, footer }) => {
    await page.goto('/');
    await footer.root.scrollIntoViewIfNeeded();
  });

  test(qase(25166, 'Footer — all 5 columns visible and correctly labelled'), async ({ footer }) => {
    for (const h of ['Expertises', 'Services', 'Company', 'Industries', 'Contacts']) {
      await expect.soft(footer.heading(h), `column "${h}"`).toBeVisible();
    }
  });

  test(qase(25167, 'Footer — Expertises: all 8 links navigate correctly'), async ({ page, footer }) => {
    for (const name of FOOTER_EXPERTISES) {
      await test.step(name, async () => {
        const link = footer.link(name);
        await expect(link).toHaveAttribute('href', /\/work\?/);
        const href = (await link.getAttribute('href'))!;
        const res = await page.request.get(href);
        expect.soft(res.status(), `${name} -> ${href}`).toBe(200);
      });
    }
    await test.step('click one link: filter applied on /work', async () => {
      await footer.link('Mobile development').click();
      await expect(page).toHaveURL(/\/work\?categories=Mobile/);
      await expect(page.getByText(/Showing \d+ projects out of \d+/)).toBeVisible();
    });
  });

  test(qase(25168, 'Footer — Company column: all links work (internal, external, form)'), async ({ page, footer, modals }) => {
    for (const [name, path] of FOOTER_COMPANY_INTERNAL) {
      await test.step(name, async () => {
        await page.goto('/');
        await footer.link(name).click();
        await expect(page).toHaveURL(new RegExp(`${path}$`));
      });
    }
    for (const [name, url] of FOOTER_COMPANY_EXTERNAL) {
      await test.step(`${name} (new tab)`, async () => {
        await expect(footer.link(name)).toHaveAttribute('href', url);
        await expect(footer.link(name)).toHaveAttribute('target', '_blank');
      });
    }
    await test.step("'Download Presentation' opens form, not a download", async () => {
      let downloaded = false;
      page.on('download', () => { downloaded = true; });
      await footer.button('Download Presentation').click();
      await expect(modals.pipedriveIframe).toBeVisible();
      await expect(modals.pipedrive.getByText('Request Our Company Overview')).toBeVisible();
      expect(downloaded).toBe(false);
    });
  });

  test(qase(25169, 'Footer — Company: external links open in new tab (Support Ukraine, In-house Software)'), async ({ page, footer }) => {
    for (const name of ['Support Ukraine', 'In-house Software']) {
      const link = footer.link(name);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link.locator('svg, img')).toHaveCount(1, { timeout: 2_000 }).catch(() => expect.soft(false, `${name}: external icon ↗ missing`).toBe(true));
    }
    const popup = page.context().waitForEvent('page');
    await footer.link('Support Ukraine').click();
    await expect(await popup).toHaveURL(/u24\.gov\.ua/);
    await expect(page).toHaveURL(/devit\.group/);
  });

  test(qase(25170, 'Footer — Industries: all 5 links navigate correctly'), async ({ page, footer }) => {
    for (const name of FOOTER_INDUSTRIES) {
      await test.step(name, async () => {
        const href = (await footer.link(name).getAttribute('href'))!;
        expect(href).toMatch(/\/work\?industries=/i);
        expect.soft((await page.request.get(href)).status()).toBe(200);
      });
    }
    await footer.link('Fintech').click();
    await expect(page).toHaveURL(/industries=Fintech/i);
    await expect(page.locator('main h2').first()).toHaveText(/Fintech/i);
  });

  test(qase(25171, 'Footer — Contacts: Book a call opens booking form'), async ({ page, modals, jsErrors }) => {
    await page.getByRole('button', { name: 'dev it book a call button' }).click();
    await expect(modals.functionalCookiesPopup.or(modals.calendlyIframe)).toBeVisible();
    expect(jsErrors).toEqual([]);
  });

  test.describe('with cookies accepted', () => {
    test.use({ consent: 'accept' });
    test(qase(25172, 'Footer — Contacts: Live chat opens chat widget'), async ({ page, modals }) => {
      await page.getByRole('button', { name: 'dev it contact link' }).filter({ hasText: 'Start a conversation' }).click();
      await expect(modals.anyChatWidget).toBeVisible({ timeout: 15_000 });
    });
  });

  test(qase(25173, 'Footer — internal links open in same tab, external in new tab (+rel)'), async ({ footer }) => {
    const links = await footer.root.locator('a[href]').evaluateAll((as) => as.map((a) => ({
      text: (a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 30),
      href: a.getAttribute('href')!, target: a.getAttribute('target') ?? '', rel: a.getAttribute('rel') ?? '',
    })));
    const internal = links.filter((l) => l.href.startsWith('/') || l.href.startsWith('https://devit.group'));
    const external = links.filter((l) => /^https?:/.test(l.href) && !l.href.startsWith('https://devit.group'));
    expect.soft(internal.filter((l) => l.target === '_blank').map((l) => l.href), 'internal links with target=_blank').toEqual([]);
    expect.soft(external.filter((l) => l.target !== '_blank').map((l) => `${l.href} target="${l.target}"`), 'external links not opening a new tab (target must be "_blank")').toEqual([]);
    expect.soft(external.filter((l) => !/noopener/.test(l.rel)).map((l) => l.href), 'external links without rel=noopener').toEqual([]);
    expect.soft(links.filter((l) => /^(tel|mailto):(undefined|null)?$/.test(l.href)).map((l) => l.href), 'broken tel:/mailto:').toEqual([]);
    expect.soft(internal.filter((l) => /\/work\?/.test(l.href) && !/nofollow/.test(l.rel)).map((l) => l.href), 'filtered /work links without nofollow').toEqual([]);
  });

  test(qase(25174, 'Footer — hover animation line on footer links'), async ({ page, footer }) => {
    const link = footer.link('About us');
    const snapshot = () => link.evaluate((e) => {
      const s = getComputedStyle(e); const a = getComputedStyle(e, '::after'); const b = getComputedStyle(e, '::before');
      return [s.color, s.textDecorationLine, a.width, a.transform, b.width, b.transform, s.cursor].join('|');
    });
    await page.mouse.move(0, 0);
    const before = await snapshot();
    await link.hover();
    await page.waitForTimeout(500);
    expect(await snapshot()).not.toBe(before);
    expect(await link.evaluate((e) => getComputedStyle(e).cursor)).toBe('pointer');
  });

  test.describe('1920px', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });
    test(qase(25175, 'Footer — no extra whitespace at bottom on high-resolution screens'), async ({ page, footer }) => {
      await page.goto('/privacy-policy');
      const gap = await page.evaluate(() => {
        const f = document.querySelector('footer')!.getBoundingClientRect();
        return document.documentElement.scrollHeight - (f.bottom + window.scrollY);
      });
      expect(gap, 'white gap below footer, px').toBeLessThanOrEqual(2);
      await expect(footer.root).toBeAttached();
    });
  });

  test(qase(25176, 'Footer — Contacts block: Agency and In-house links'), async ({ page }) => {
    await expect(page.locator('footer a[href="mailto:hi@devit.group"]')).toBeVisible();
    await expect(page.locator('footer a[href="mailto:support@devit.software"]')).toBeVisible();
    await expect(page.locator('footer a[href="tel:+380636599155"]')).toBeVisible();
    await expect(page.locator('footer a[href="tel:+19292371255"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'dev it contact link' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'open support chat' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'dev it book a call button' })).toBeVisible();
    await expect(page.locator('footer').getByRole('button', { name: 'open book a call modal', exact: true })).toBeVisible();
  });

  test(qase(25177, 'Footer — Privacy Policy and Cookie Policy links work'), async ({ page, footer }) => {
    await footer.link('Privacy Policy').click();
    await expect(page).toHaveURL(/\/privacy-policy$/);
    await expect(page.locator('h1')).toHaveText(/Privacy Policy/);
    await page.goBack();
    await footer.link('Cookie Policy').click();
    await expect(page).toHaveURL(/\/cookie-policy$/);
    await expect(page.locator('h1')).toHaveText(/Cookie Policy/);
  });

  test(qase(25178, 'Footer — social media icons: present, loaded, same size, correct links'), async ({ footer }) => {
    const expected = [/linkedin\.com\/company\/devit-group/, /youtube\.com\/@DevIT-group/, /behance\.net\/DevIT-group/, /upwork\.com\/agencies\/devit/, /clutch\.co\/profile\/devit/];
    const hrefs = await footer.socialLinks.evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    for (const rx of expected) expect.soft(hrefs.some((h) => rx.test(h)), `social link ${rx}`).toBe(true);
    const sizes = await footer.socialLinks.evaluateAll((as) => as.map((a) => { const r = a.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; }));
    expect.soft(new Set(sizes).size, `icon sizes differ: ${sizes.join(', ')}`).toBe(1);
    const targets = await footer.socialLinks.evaluateAll((as) => as.map((a) => a.getAttribute('target')));
    expect.soft(targets.filter((t) => t !== '_blank'), 'social links must use target="_blank"').toEqual([]);
  });

  test(qase(25179, "Footer — 'Download Presentation' opens 'Request Our Company Overview' form"), async ({ page, footer, modals }) => {
    await footer.button('Download Presentation').click();
    await expect(modals.pipedriveIframe).toBeVisible();
    await expect(modals.pipedrive.getByText('Request Our Company Overview')).toBeVisible();
    await expect(modals.field(/Full Name/)).toBeVisible();
    await expect(modals.field(/Email/)).toBeVisible();
    await expect(modals.pipedrive.getByRole('button', { name: 'Get the presentation' })).toBeVisible();
    await test.step('empty submit -> validation, no submit', async () => {
      await modals.pipedrive.getByRole('button', { name: 'Get the presentation' }).click();
      await expect(modals.requiredError).toBeVisible();
    });
    // valid submit is NOT automated on prod (creates a lead)
    await modals.closeButton.click();
    await expect(modals.pipedriveIframe).toBeHidden();
    await expect(page).toHaveURL(/devit\.group\/?$/);
  });

  test(qase(25180, "Footer — phone link href is a valid tel: number on ALL pages (no 'tel:undefined')"), async ({ page, footer }) => {
    for (const p of PAGES) {
      await test.step(p.path, async () => {
        await page.goto(p.path);
        const tels = await footer.telLinks.evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
        expect.soft(tels.length, `${p.path}: no tel: links`).toBeGreaterThan(0);
        expect.soft(tels.filter((t) => !/^tel:\+\d{10,13}$/.test(t)), `${p.path}: invalid tel:`).toEqual([]);
      });
    }
  });
});
