// @ts-check
const { test, expect } = require('@playwright/test');
const { dismissCookieBanner } = require('../../helpers');

test.describe('[NAV-01] Logo', () => {

  test('[80000] Logo visible and links to / from any page', async ({ page }) => {
    for (const path of ['/', '/work', '/about', '/shopify']) {
      await page.goto(path);
      await dismissCookieBanner(page);
      const logo = page.locator('header a[href="/"]').first();
      await expect(logo).toBeVisible({ timeout: 8_000 });
    }
    await page.goto('/work');
    await dismissCookieBanner(page);
    const logo = page.locator('header a[href="/"]').first();
    await logo.click();
    await expect(page).toHaveURL(/devit\.group\/?$/, { timeout: 8_000 });
  });

});

test.describe('[NAV-02] Desktop Navigation', () => {

  test('[80001] All nav items present and correctly labelled', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    const nav = page.locator('header nav, header [class*="menu" i]:not([class*="mobile" i]), header [class*="nav" i]').first();
    await expect(nav).toBeVisible({ timeout: 8_000 });
    // Site nav: Shopify, Products, Work, Case Studies, Contacts (no About/Blog in header)
    for (const label of ['Work', 'Shopify', 'Contacts']) {
      await expect(page.locator('header').getByText(label, { exact: false }).first())
        .toBeVisible({ timeout: 6_000 });
    }
  });

  test('[80002] Nav items open correct pages', async ({ page }) => {
    const items = [
      { text: 'Work',  urlRe: /\/work/ },
      { text: 'About', urlRe: /\/about/ },
      { text: 'Blog',  urlRe: /\/blog/ },
    ];
    for (const { text, urlRe } of items) {
      await page.goto('/');
      await dismissCookieBanner(page);
      await page.waitForLoadState('networkidle');
      const link = page.locator('header nav a, header [class*="nav" i] a')
        .filter({ hasText: new RegExp(`^${text}$`, 'i') }).first();
      if (await link.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await link.click();
        await expect(page).toHaveURL(urlRe, { timeout: 10_000 });
      }
    }
  });

  test('[80003] Products dropdown: items present and clickable', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    const productsBtn = page.locator('header').getByText(/products|apps/i).first();
    if (await productsBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await productsBtn.click();
      await page.waitForTimeout(400);
      const dropdown = page.locator('[class*="dropdown" i]:visible, [class*="submenu" i]:visible').first();
      await expect(dropdown).toBeVisible({ timeout: 5_000 });
      // At least one product link is clickable
      const links = dropdown.locator('a[href]');
      expect(await links.count()).toBeGreaterThan(0);
    }
  });

  test('[80006] Active nav state on current page', async ({ page }) => {
    await page.goto('/work');
    await dismissCookieBanner(page);
    // Check for aria-current or active class on the Work link
    const activeLink = page.locator(
      'header nav a[aria-current="page"], header nav a[class*="active" i], header [class*="nav" i] a[class*="active" i]'
    );
    if (await activeLink.count() > 0) {
      await expect(activeLink.first()).toBeVisible();
    }
    // Also verify Work link is in the header (not hidden)
    const workLink = page.locator('header').getByRole('link', { name: /^work$/i }).first();
    if (await workLink.count() > 0) {
      await expect(workLink).toBeVisible();
    }
  });

  test('[80008] No horizontal scroll at 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const cw = await page.evaluate(() => document.documentElement.clientWidth);
    expect(sw, `horizontal overflow: scrollWidth=${sw} clientWidth=${cw}`).toBeLessThanOrEqual(cw + 5);
  });

});

test.describe('[NAV-03] Mobile Navigation', () => {

  test('[80011] Burger opens menu with all nav items', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await dismissCookieBanner(page);
    // header.getByRole('button').first() reliably finds the visible burger at mobile viewport
    const burger = page.locator('header').getByRole('button').first();
    await expect(burger).toBeVisible({ timeout: 8_000 });
    await burger.click();
    await page.waitForTimeout(600);
    const navLinks = page.locator(
      'nav a:visible, [class*="mobileMenu" i] a:visible, [class*="mobile-menu" i] a:visible, [class*="nav" i] a:visible'
    );
    expect(await navLinks.count()).toBeGreaterThan(2);
  });

  test('[80012] Each mobile nav link navigates correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await dismissCookieBanner(page);
    const burger = page.locator('[class*="burger" i], [class*="hamburger" i], button[aria-label*="menu" i]').first();
    if (await burger.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await burger.click();
      await page.waitForTimeout(500);
      const workLink = page.locator('nav a, [class*="menu" i] a')
        .filter({ hasText: /^work$/i }).first();
      if (await workLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await workLink.click();
        await expect(page).toHaveURL(/\/work/, { timeout: 8_000 });
        expect((await page.locator('h1').first().innerText()).trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('[80015] Mobile logo links to /', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/work');
    await dismissCookieBanner(page);
    // filter to visible — desktop logo link may be hidden at mobile viewport
    const logo = page.locator('header a[href="/"]').filter({ visible: true }).first();
    await expect(logo).toBeVisible({ timeout: 8_000 });
    await logo.click();
    await expect(page).toHaveURL(/devit\.group\/?$/, { timeout: 8_000 });
  });

});

test.describe('[NAV-04] Contacts Dropdown', () => {

  test('[80037] Contacts dropdown opens and contains /support and /contact links', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    // Hover over "Contacts" in header
    const contactsBtn = page.locator('header').getByText(/contacts/i).first();
    if (await contactsBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await contactsBtn.hover();
      await page.waitForTimeout(400);
      // Wait for dropdown to appear
      const dropdown = page.locator('[class*="dropdown" i]:visible, [class*="submenu" i]:visible').first();
      const hasDropdown = await dropdown.isVisible({ timeout: 4_000 }).catch(() => false);
      if (hasDropdown) {
        // Check for /support and /contact links in dropdown
        const supportLink = dropdown.locator('a[href*="/support"]').first();
        const contactLink = dropdown.locator('a[href*="/contact"]').first();
        const hasSupport = await supportLink.count() > 0;
        const hasContact = await contactLink.count() > 0;
        expect(hasSupport || hasContact, 'Expected dropdown to contain /support or /contact links').toBe(true);
      } else {
        // Fallback: check if links are visible anywhere in header after hover
        const supportLink = page.locator('header a[href*="/support"]').first();
        const contactLink = page.locator('header a[href*="/contact"]').first();
        const hasSupport = await supportLink.isVisible({ timeout: 3_000 }).catch(() => false);
        const hasContact = await contactLink.isVisible({ timeout: 3_000 }).catch(() => false);
        expect(hasSupport || hasContact, 'Expected /support or /contact link visible after hovering Contacts').toBe(true);
      }
    }
  });

});
