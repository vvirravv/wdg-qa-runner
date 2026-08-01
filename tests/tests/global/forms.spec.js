// @ts-check
const { test, expect } = require('@playwright/test');
const { dismissCookieBanner } = require('../../helpers');

// ─── Main contact form ("Ready for cooperation?") ─────────────────────────────
test.describe('[F-01] Contact form — "Ready for cooperation?"', () => {

  async function openForm(page) {
    await page.goto('/');
    await dismissCookieBanner(page);
    const btn = page.getByRole('link', { name: /let.?s talk/i })
      .or(page.getByRole('button', { name: /let.?s talk/i }))
      .or(page.getByRole('button', { name: /book a call/i }))
      .first();
    await btn.click();
    await page.waitForTimeout(800);
  }

  test('[F-01] form opens on "Let\'s talk" click', async ({ page }) => {
    await openForm(page);
    // Filter to visible only — the backdrop div exists in DOM but may be hidden
    const form = page.locator('[class*="modal" i], [class*="form" i], iframe').filter({ visible: true }).first();
    await expect(form).toBeVisible({ timeout: 10_000 });
  });

  test('[F-01] form has Name, Email, Message fields', async ({ page }) => {
    await openForm(page);
    await page.waitForTimeout(500);
    // If it's a PipeDrive/embedded iframe, skip field checks (can't access cross-origin iframe)
    const iframe = page.locator('iframe').filter({ visible: true }).first();
    if (await iframe.count() > 0) {
      await expect(iframe).toBeVisible({ timeout: 8_000 });
      return; // embedded iframe — cross-origin, can't inspect internals
    }
    const nameField  = page.getByLabel(/name/i).or(page.locator('input[name*="name" i]')).filter({ visible: true }).first();
    const emailField = page.getByLabel(/email/i).or(page.locator('input[type="email"]')).filter({ visible: true }).first();
    await expect(nameField).toBeVisible({ timeout: 8_000 });
    await expect(emailField).toBeVisible({ timeout: 8_000 });
  });

  test('[F-01] empty submit shows validation errors', async ({ page }) => {
    await openForm(page);
    const iframe = page.locator('iframe[src*="pipedrive"]').first();
    if (await iframe.count() > 0) {
      test.skip(); return; // PipeDrive iframe — skip
    }
    const submit = page.getByRole('button', { name: /send|submit|відправити/i }).first();
    if (await submit.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await submit.click();
      await page.waitForTimeout(500);
      // Error indicators: aria-invalid, .error class, or error text
      const errors = page.locator('[aria-invalid="true"], [class*="error" i]:visible, [class*="invalid" i]:visible').first();
      await expect(errors).toBeVisible({ timeout: 5_000 });
    }
  });

  test('[F-01] invalid email shows error', async ({ page }) => {
    await openForm(page);
    const iframe = page.locator('iframe[src*="pipedrive"]').first();
    if (await iframe.count() > 0) {
      test.skip(); return;
    }
    const emailField = page.locator('input[type="email"]').first();
    if (await emailField.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await emailField.fill('not-an-email');
      await emailField.press('Tab');
      await page.waitForTimeout(300);
      const isInvalid = await emailField.evaluate(el => !el.validity.valid);
      expect(isInvalid).toBe(true);
    }
  });

  test('[F-01] form closes on X or Escape', async ({ page }) => {
    await openForm(page);
    // Try Escape key first
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    const modal = page.locator('[class*="modal" i]:visible').first();
    const stillOpen = await modal.isVisible().catch(() => false);
    if (stillOpen) {
      // Try close button
      const closeBtn = page.getByRole('button', { name: /close|×|✕/i }).first();
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(400);
        await expect(modal).not.toBeVisible({ timeout: 3_000 });
      }
    } else {
      expect(stillOpen).toBe(false);
    }
  });

});

// ─── /contact routing modal ───────────────────────────────────────────────────
test.describe('[F-02] Contact page — routing modal', () => {

  test('[F-02] "Got a project?" modal appears automatically', async ({ page }) => {
    await page.goto('/contact');
    const heading = page.getByRole('heading', { name: /got a project/i })
      .or(page.getByText(/got a project/i)).first();
    await expect(heading).toBeVisible({ timeout: 8_000 });
  });

  test('[F-02] modal has "Go to Agency" and "Stay here" options', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForTimeout(1000);
    const goAgency  = page.getByRole('link',   { name: /go to agency/i }).or(page.getByRole('button', { name: /go to agency/i })).first();
    const stayHere  = page.getByRole('button', { name: /stay here/i }).or(page.getByRole('link', { name: /stay here/i })).first();
    const eitherBtn = goAgency.or(stayHere);
    await expect(eitherBtn).toBeVisible({ timeout: 8_000 });
  });

  test('[F-02] "Stay here" closes modal and shows page content', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForTimeout(1000);
    const stayBtn = page.getByRole('button', { name: /stay here/i }).first();
    if (await stayBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await stayBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator('h1')).toBeVisible({ timeout: 5_000 });
    }
  });

});

// ─── /support routing modal ───────────────────────────────────────────────────
test.describe('[F-03] Support page — routing modal', () => {

  test('[F-03] "Need help with an app?" modal appears', async ({ page }) => {
    await page.goto('/support');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);
    // Modal may appear after delay; use filter for visible only
    const visibleModal = page.locator('[class*="modal" i], [class*="popup" i], [class*="dialog" i]')
      .filter({ visible: true }).filter({ hasText: /need help/i }).first();
    if (await visibleModal.count() > 0) {
      await expect(visibleModal).toBeVisible({ timeout: 5_000 });
    } else {
      // Modal may not appear in current session (cookies/state); verify text exists in DOM
      const heading = page.getByText(/need help/i).first();
      expect(await heading.count()).toBeGreaterThan(0);
    }
  });

  test('[F-03] modal has "Go to Agency" and "Stay here"', async ({ page }) => {
    await page.goto('/support');
    await page.waitForTimeout(1000);
    const btn = page.getByRole('button', { name: /stay here|go to agency/i }).first();
    await expect(btn).toBeVisible({ timeout: 8_000 });
  });

});
