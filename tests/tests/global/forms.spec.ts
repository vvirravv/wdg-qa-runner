import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';

/**
 * Global forms. PRODUCTION SAFETY: no test submits a Pipedrive form with valid data
 * (would create a real lead). Full submit + Pipedrive verification stays manual (see coverage.csv).
 */
test.describe('Forms — Ready for cooperation? (Pipedrive)', () => {
  test.beforeEach(async ({ page, modals }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'open lets talk modal button' }).first().click();
    await expect(modals.pipedriveIframe).toBeVisible();
  });

  test(qase(25212, "'Ready for cooperation?' form — opens without consent, is a Pipedrive web form (partial) @critical"), async ({ modals }) => {
    await expect(modals.pipedriveIframe).toHaveAttribute('src', /webforms\.pipedrive\.com/);
    await expect(modals.pipedrive.getByText('Ready for cooperation?')).toBeVisible();
    for (const f of [/Full Name/, /Email/, /Phone/, /How did you hear/, /How can we help/]) await expect.soft(modals.field(f)).toBeVisible();
    await modals.submit.click();
    await expect(modals.requiredError).toBeVisible();
  });

  test(qase(25246, "Modal — 'How did you hear about us?' dropdown opens and lists options"), async ({ modals }) => {
    const select = modals.field(/How did you hear/);
    const options = await select.locator('option').allTextContents();
    const real = options.map((o) => o.trim()).filter((o) => o && !/select/i.test(o));
    expect(real.length, `options: ${options.join(' | ')}`).toBeGreaterThan(1);
    await select.selectOption({ label: real[0] });
    await expect(select).toHaveValue(/.+/);
    await select.selectOption({ label: real[1] });
    expect(await select.evaluate((s: HTMLSelectElement) => s.selectedOptions[0].text.trim())).toBe(real[1]);
  });

  test(qase(25216, 'Form — network offline during submit -> error shown, data kept (partial: step 1)'), async ({ page, context, modals }) => {
    await modals.field(/Full Name/).fill('QA-OFFLINE-AUTOTEST');
    await modals.field(/Email/).fill('qa-offline@devit.group');
    await context.setOffline(true);
    await modals.submit.click();
    await expect(modals.pipedrive.getByText(/went wrong|connection|error|try again/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(modals.field(/Full Name/)).toHaveValue('QA-OFFLINE-AUTOTEST');
    // do NOT go back online with the form filled: a retry would create a real lead
    await page.goto('about:blank');
    await context.setOffline(false);
  });

  test(qase(25218, 'Form — very long name (255+ chars) handled gracefully (partial: no submit)'), async ({ modals }) => {
    const name = modals.field(/Full Name/);
    await name.fill('A'.repeat(256));
    const len = (await name.inputValue()).length;
    const max = await name.getAttribute('maxlength');
    test.info().annotations.push({ type: 'maxlength', description: `maxlength=${max ?? 'none'}, accepted=${len}` });
    if (max) expect(len).toBeLessThanOrEqual(Number(max));
    await modals.field(/Email/).fill('bad');
    await modals.submit.click();
    await expect(modals.emailError).toBeVisible();
    const overflow = await name.evaluate((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow === 'visible');
    expect(overflow, 'long value breaks input layout').toBe(false);
  });

  for (const email of ['plainaddress', 'user@', '@devit.group', 'user name@mail.com']) {
    test(qase(25212, `'Ready for cooperation?' — invalid email "${email}" is rejected`), async ({ modals }) => {
      await modals.field(/Full Name/).fill('QA Autotest');
      await modals.field(/Email/).fill(email);
      await modals.submit.click();
      await expect(modals.emailError).toBeVisible();
    });
  }
});

test.describe("Forms — 'Request callback' (partial)", () => {
  test.use({ consent: 'accept' });
  test(qase(25213, "'Request callback' form — opens, validates phone (no submit) @critical"), async ({ page }) => {
    await page.goto('/contact');
    await page.getByRole('button', { name: 'request callback button' }).first().click();
    const form = page.locator('iframe:visible, [role="dialog"]:visible, form:visible').first();
    await expect(form, 'callback form did not open').toBeVisible({ timeout: 15_000 });
    const phone = page.getByRole('textbox', { name: /phone/i }).or(page.frameLocator('iframe:visible').first().getByRole('textbox', { name: /phone/i })).first();
    await expect(phone).toBeVisible();
    for (const value of ['', 'abcdef', '123']) {
      await test.step(`invalid phone "${value}"`, async () => {
        await phone.fill(value);
        await page.keyboard.press('Enter');
        await expect(page.getByText(/required|valid|invalid|incorrect/i).filter({ visible: true }).first()).toBeVisible();
      });
    }
  });
});

test.describe("Forms — 'Book a call' booking (Calendly)", () => {
  test.use({ consent: 'accept' });

  test(qase(25214, "Header 'Book a call' -> consent prompt when Functional Cookies disabled, Accept loads booking"), async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.locator('#decline').click({ timeout: 10_000 }).catch(() => undefined);
    await page.getByRole('button', { name: 'open book a call modal button' }).click();
    await expect(page.getByText(/Functional Cookies are disabled/i).filter({ visible: true })).toBeVisible();
    await page.getByRole('button', { name: 'enable popup btn' }).filter({ visible: true }).click();
    await page.getByRole('button', { name: 'open book a call modal button' }).click();
    await expect(page.locator('iframe[src*="calendly.com"]').filter({ visible: true })).toBeVisible({ timeout: 20_000 });
    await ctx.close();
  });

  test(qase(25215, "'Book a call' — booking form flow up to details step (no booking) @critical"), async ({ page, header, modals, jsErrors }) => {
    await page.goto('/');
    await header.bookACall.click();
    if (await modals.functionalCookiesAccept.isVisible().catch(() => false)) {
      await modals.functionalCookiesAccept.click();
      await header.bookACall.click();
    }
    await expect(modals.calendlyIframe).toBeVisible({ timeout: 20_000 });
    const cal = modals.calendlyIframe.contentFrame();
    await test.step('calendar rendered with available days and timezone', async () => {
      await expect(cal.locator('[data-container="calendar"], [data-testid="calendar"]').first()).toBeVisible({ timeout: 20_000 });
      await expect(cal.getByText(/time zone/i).first()).toBeVisible();
    });
    await test.step('pick first available day and slot -> details step', async () => {
      await cal.locator('button[aria-label*="Times available"], button[aria-label*="available"]').first().click();
      await cal.locator('[data-container="time-button"], button[data-start-time]').first().click();
      await cal.getByRole('button', { name: /Next/i }).first().click();
      await expect(cal.getByLabel(/Name/i).first()).toBeVisible();
      await expect(cal.getByLabel(/Email/i).first()).toBeVisible();
      // STOP: do not schedule a real meeting on production
    });
    await test.step('close via X; page scroll works', async () => {
      await modals.closeButton.click();
      await expect(modals.calendlyIframe).toBeHidden();
      await page.mouse.wheel(0, 500);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    });
    expect(jsErrors).toEqual([]);
  });
});
