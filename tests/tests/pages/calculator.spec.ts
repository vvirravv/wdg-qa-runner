import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { CalculatorPage } from '../../src/pom/CalculatorPage';
import { ownErrors } from '../../src/helpers';

test.describe('Calculator — Functional', () => {
  let calc: CalculatorPage;
  test.beforeEach(async ({ page }) => { calc = new CalculatorPage(page); await calc.open(); });

  test(qase(25386, 'Calculator — step 1: industry dropdown appears and is selectable'), async ({ page }) => {
    await expect(calc.progress).toHaveText('Question 1 of 5');
    await expect(page.getByText('What’s your industry?')).toBeVisible();
    await calc.combobox.click();
    const opts = await page.getByRole('option').allInnerTexts();
    expect(opts.length).toBeGreaterThanOrEqual(5);
    expect(opts.filter((o) => !o.trim() || /undefined/.test(o))).toEqual([]);
    await page.getByRole('option', { name: 'E-Commerce' }).click();
    await expect(calc.combobox).toHaveText('E-Commerce');
  });

  test(qase(25387, "Calculator — 'Next' advances to step 2"), async () => {
    await calc.answer();
    await calc.next.click();
    await expect(calc.progress).toHaveText('Question 2 of 5');
    await expect(calc.combobox).toHaveText(/Choose your project type/);
  });

  test(qase(25388, "Calculator — 'Next' is blocked if no option selected"), async () => {
    await expect(calc.next).toBeDisabled();
    await calc.next.click({ force: true });
    await expect(calc.progress).toHaveText('Question 1 of 5');
  });

  test(qase(25389, 'Calculator — complete all 5 steps and reach summary'), async ({ page }) => {
    const answers = await calc.completeAll();
    await expect(calc.costRange).toBeVisible();
    await expect(page.getByText('Project Cost')).toBeVisible();
    await expect(page.getByText('Timeline')).toBeVisible();
    for (const a of answers) await expect.soft(page.locator('main').getByText(a.replace(/\s+/g, ' ').trim(), { exact: false }).first(), `summary: ${a}`).toBeVisible();
    expect(await page.locator('main').innerText()).not.toMatch(/undefined|NaN/);
  });

  test(qase(25390, 'Calculator — progress indicator updates on each step'), async () => {
    for (let i = 1; i <= 5; i++) {
      await expect(calc.progress).toHaveText(`Question ${i} of 5`);
      await calc.answer();
      await calc.next.click();
    }
  });

  test(qase(25391, "Calculator — Summary panel CTA opens contact form"), async ({ page, modals }) => {
    await page.getByRole('button', { name: 'open lets talk modal button' }).first().click();
    await expect(modals.pipedriveIframe).toBeVisible();
    await page.reload();
    await calc.completeAll();
    const start = page.getByRole('button', { name: /Start your project|Let.s talk/ }).filter({ visible: true }).first();
    await start.click();
    await expect(modals.pipedriveIframe.or(page.locator('iframe[src*="calendly"]:visible'))).toBeVisible();
  });

  test(qase(25392, 'Calculator — FAQ: all 5 questions expand and collapse'), async ({ page }) => {
    const faq = page.getByRole('heading', { name: 'FAQ', level: 2 }).locator('xpath=ancestor::section[1]').locator('button[aria-expanded]');
    await expect(faq).toHaveCount(5);
    for (let i = 0; i < 5; i++) {
      await faq.nth(i).click();
      await expect(faq.nth(i)).toHaveAttribute('aria-expanded', 'true');
      if (i === 0) {
        await faq.nth(0).click();
        await expect(faq.nth(0)).toHaveAttribute('aria-expanded', 'false');
      }
    }
  });

  test(qase(25393, "Calculator — bottom 'Book a call' and 'Request callback'"), async ({ page, modals }) => {
    const bottom = page.getByRole('heading', { name: 'Ready for cooperation?' }).locator('xpath=ancestor::section[1]');
    await bottom.getByRole('button', { name: 'open book a call modal button' }).click();
    await expect(modals.functionalCookiesPopup.or(modals.calendlyIframe)).toBeVisible();
    await page.reload();
    await bottom.getByRole('button', { name: 'request callback button' }).click();
    await expect(page.getByRole('textbox', { name: /phone/i }).or(modals.functionalCookiesPopup).or(page.locator('iframe:visible').last()).first()).toBeVisible({ timeout: 15_000 });
  });

  test(qase(25394, 'Calculator — no JS errors during interaction'), async ({ jsErrors }) => {
    await calc.completeAll();
    expect(ownErrors(jsErrors)).toEqual([]);
  });

  test(qase(25395, "Calculator — 'Back' returns to previous step, selections preserved"), async () => {
    const a1 = await calc.answer(); await calc.next.click();
    await expect(calc.progress).toHaveText('Question 2 of 5');
    await calc.back.click();
    await expect(calc.progress).toHaveText('Question 1 of 5');
    await expect(calc.combobox).toHaveText(a1);
    await calc.next.click();
    await calc.answer(); await calc.next.click();
    await calc.answer(); await calc.next.click();
    await calc.back.click(); await calc.back.click(); await calc.back.click();
    await expect(calc.progress).toHaveText('Question 1 of 5');
    await expect(calc.combobox).toHaveText(a1);
  });

  test(qase(25396, 'Calculator — step navigation via summary panel'), async ({ page }) => {
    await calc.answer(); await calc.next.click();
    await calc.answer(); await calc.next.click();
    await page.locator('main').getByText('Industry', { exact: true }).click();
    await expect(calc.progress, 'summary steps are not clickable').toHaveText('Question 1 of 5');
  });

  test.describe('cookies accepted', () => {
    test.use({ consent: 'accept' });
    test(qase(25397, "Calculator — 'Let's chat' opens chat widget"), async ({ page, modals }) => {
      await page.getByRole('button', { name: 'open live chat button' }).click();
      await expect(modals.anyChatWidget).toBeVisible({ timeout: 15_000 });
    });
  });

  test(qase(25398, 'Calculator — page refresh mid-flow: no broken state'), async ({ page, jsErrors }) => {
    await calc.answer(); await calc.next.click();
    await calc.answer(); await calc.next.click();
    await expect(calc.progress).toHaveText('Question 3 of 5');
    await page.reload();
    const step = await calc.step();
    expect([1, 3], `inconsistent state after reload (step ${step})`).toContain(step);
    while ((await calc.step()) < 5) { await calc.answer(); await calc.next.click(); }
    await page.reload();
    for (let guard = 0; guard < 6 && (await calc.progress.isVisible()); guard++) { await calc.answer(); await calc.next.click(); }
    await expect(calc.costRange).toBeVisible();
    expect(ownErrors(jsErrors)).toEqual([]);
  });
});
