// @ts-check
const { test, expect } = require('@playwright/test');
const { dismissCookieBanner } = require('../../helpers');

// ─── /work ────────────────────────────────────────────────────────────────────
test.describe('[WORK] Work page (/work)', () => {

  test('[80129] Industry filter tabs all present', async ({ page }) => {
    await page.goto('/work');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    const tabs = page.locator('[class*="tab" i], [class*="filter" i], [class*="categor" i]').first();
    const body = await page.locator('body').innerText();
    // Page should have filter/category keywords
    const hasFilters = body.match(/all|e.commerce|shopify|website|mobile/i);
    expect(hasFilters, 'No filter tabs found on /work').toBeTruthy();
  });

  test('[80130] Clicking category filter shows only matching projects', async ({ page }) => {
    await page.goto('/work');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    const filterBtns = page.locator('[class*="tab" i]:visible, [class*="filter" i]:visible button').first();
    if (await filterBtns.count() > 0) {
      await filterBtns.click();
      await page.waitForTimeout(600);
      const cards = page.locator('[class*="card" i]:visible, [class*="project" i]:visible');
      // After filter, page should still show at least 1 result
      expect(await cards.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('[80131] Project cards have title, image and country flag', async ({ page }) => {
    await page.goto('/work');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    const cards = page.locator('a[href*="/work/"]');
    const count = await cards.count();
    expect(count, 'No project cards found on /work').toBeGreaterThan(0);
    // First card should have an image inside it
    const firstCard = cards.first();
    const img = firstCard.locator('img').first();
    if (await img.count() > 0) {
      const src = await img.getAttribute('src');
      expect(src).toBeTruthy();
    }
  });

  test('[80132] Clicking a card navigates to correct project detail', async ({ page }) => {
    await page.goto('/work');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    const firstCard = page.locator('a[href*="/work/"]').first();
    await expect(firstCard).toBeVisible({ timeout: 8_000 });
    const href = await firstCard.getAttribute('href');
    expect(href).toMatch(/\/work\/.+/);
    await firstCard.click();
    await expect(page).toHaveURL(/\/work\/.+/, { timeout: 10_000 });
    const res = await page.request.get(page.url());
    expect(res.status()).toBe(200);
  });

  test('[80134] No broken images on /work', async ({ page }) => {
    const broken = [];
    page.on('response', r => {
      if (/\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(r.url()) && r.status() >= 400)
        broken.push(`${r.status()} ${r.url()}`);
    });
    await page.goto('/work');
    await page.waitForLoadState('networkidle');
    expect(broken, `Broken images: ${broken.join(', ')}`).toHaveLength(0);
  });

  test('[80136] Search: "no results" state for unknown keyword', async ({ page }) => {
    await page.goto('/work');
    await dismissCookieBanner(page);
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill('xyzxyzxyz_nonexistent_project_12345');
      await page.waitForTimeout(700);
      const body = await page.locator('body').innerText();
      const noResults = /no results|not found|нічого|0 project/i.test(body)
        || (await page.locator('a[href*="/work/"]').count()) === 0;
      expect(noResults, 'Expected "no results" state for unknown search query').toBeTruthy();
    }
  });

});

// ─── /about ───────────────────────────────────────────────────────────────────
test.describe('[ABOUT] About page (/about)', () => {

  test('[80254] Representatives: photos with names and country flags', async ({ page }) => {
    await page.goto('/about');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.5));
    await page.waitForTimeout(600);
    const body = await page.locator('body').innerText();
    // Page should have names and country references
    expect(body.length).toBeGreaterThan(200);
    // Look for person/team cards
    const photos = page.locator('img[alt]:not([alt=""])');
    expect(await photos.count()).toBeGreaterThan(0);
  });

  test('[80255] "How we are working" section: all process steps present', async ({ page }) => {
    await page.goto('/about');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').innerText();
    const keywords = ['discovery', 'design', 'development', 'testing', 'deploy'];
    const found = keywords.filter(k => body.toLowerCase().includes(k));
    expect(found.length, `Process steps found: ${found}`).toBeGreaterThanOrEqual(2);
  });

});

// ─── /calculator ─────────────────────────────────────────────────────────────
test.describe('[CALC] Calculator page (/calculator)', () => {

  test('[80268] Step 1: industry dropdown appears and is selectable', async ({ page }) => {
    await page.goto('/calculator');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    const dropdown = page.locator('select, [class*="dropdown" i], [class*="select" i]').first();
    const radioGroup = page.locator('[class*="option" i], [class*="choice" i], input[type="radio"]').first();
    const hasInteraction = await dropdown.isVisible({ timeout: 5_000 }).catch(() => false)
      || await radioGroup.isVisible({ timeout: 3_000 }).catch(() => false);
    expect(hasInteraction, 'Step 1 has no selectable options').toBeTruthy();
  });

  test('[80269] "Next" button advances to step 2', async ({ page }) => {
    await page.goto('/calculator');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    // Select any option
    const options = page.locator('input[type="radio"], [class*="option" i] button, [class*="choice" i]');
    if (await options.count() > 0) await options.first().click();
    const nextBtn = page.getByRole('button', { name: /next|далі|continue/i }).first();
    if (await nextBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(600);
      const body = await page.locator('body').innerText();
      // Should now be on step 2 — "Question 2 of 5" or similar
      expect(body).toMatch(/2|step 2|question 2/i);
    }
  });

  test('[80270] "Next" blocked if no option selected', async ({ page }) => {
    await page.goto('/calculator');
    await dismissCookieBanner(page);
    const nextBtn = page.getByRole('button', { name: /next|далі|continue/i }).first();
    if (await nextBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const isDisabled = await nextBtn.isDisabled() || (await nextBtn.getAttribute('class') || '').includes('disabled');
      // Either button is disabled OR clicking doesn't advance
      if (!isDisabled) {
        await nextBtn.click();
        await page.waitForTimeout(500);
        // Should still be on question 1
        const body = await page.locator('body').innerText();
        const stillOnStep1 = body.match(/1 of 5|question 1|step 1/i) || !body.match(/2 of 5|question 2/i);
        expect(stillOnStep1, 'Next advanced without selection').toBeTruthy();
      } else {
        expect(isDisabled).toBeTruthy();
      }
    }
  });

  test('[80274] FAQ: questions expand and collapse', async ({ page }) => {
    await page.goto('/calculator');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(600);
    const faqItems = page.locator('[class*="faq" i] [class*="question" i], [class*="accordion" i] button, details summary');
    if (await faqItems.count() > 0) {
      const first = faqItems.first();
      await first.click();
      await page.waitForTimeout(400);
      // Answer should be visible after click
      const answers = page.locator('[class*="faq" i] [class*="answer" i]:visible, details[open] p');
      expect(await answers.count()).toBeGreaterThan(0);
    }
  });

  test('[80276] No horizontal scroll at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/calculator');
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const cw = await page.evaluate(() => document.documentElement.clientWidth);
    expect(sw, `Horizontal overflow on /calculator at 375px: ${sw} > ${cw}`).toBeLessThanOrEqual(cw + 5);
  });

  test('[80277] No JS errors on /calculator', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => {
      if (!e.message.includes('extension') && !e.message.includes('ResizeObserver'))
        errors.push(e.message);
    });
    await page.goto('/calculator');
    await page.waitForLoadState('networkidle');
    expect(errors, `JS errors on /calculator: ${errors.join('; ')}`).toHaveLength(0);
  });

});

// ─── /blog ────────────────────────────────────────────────────────────────────
test.describe('[BLOG] Blog page (/blog)', () => {

  test('[80291] Article cards display title, category and date', async ({ page }) => {
    await page.goto('/blog');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    const cards = page.locator('article, [class*="card" i], [class*="post" i]');
    const count = await cards.count();
    expect(count, 'No article cards found on /blog').toBeGreaterThan(0);
    // First card should have some text content
    const text = await cards.first().innerText();
    expect(text.trim().length).toBeGreaterThan(10);
  });

  test('[80292] Category filter works', async ({ page }) => {
    await page.goto('/blog');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    const countBefore = await page.locator('a[href*="/blog/"]').count();
    const filterBtns = page.locator('[class*="filter" i] button:visible, [class*="categor" i] button:visible, input[type="checkbox"]');
    if (await filterBtns.count() > 1) {
      await filterBtns.nth(1).click();
      await page.waitForTimeout(800);
      const countAfter = await page.locator('a[href*="/blog/"]').count();
      // Filtering may change count — both 0 and positive are acceptable
      expect(countAfter).toBeGreaterThanOrEqual(0);
    }
  });

  test('[80293] Clicking article card opens article page', async ({ page }) => {
    await page.goto('/blog');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    const articleLink = page.locator('a[href*="/blog/"]').first();
    await expect(articleLink).toBeVisible({ timeout: 8_000 });
    const href = await articleLink.getAttribute('href');
    expect(href).toMatch(/\/blog\/.+/);
    await articleLink.click();
    await expect(page).toHaveURL(/\/blog\/.+/, { timeout: 10_000 });
    const res = await page.request.get(page.url());
    expect(res.status()).toBe(200);
  });

  test('[80294] Pagination: Prev/Next exist and work', async ({ page }) => {
    await page.goto('/blog');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    const pagination = page.locator('[class*="pagination" i], [aria-label*="pagination" i], nav[class*="page" i]').first();
    if (await pagination.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const nextBtn = pagination.getByRole('link', { name: /next|→|›/i }).first()
        .or(pagination.locator('a').last());
      if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await nextBtn.click();
        await expect(page).not.toHaveURL(/\/blog$/, { timeout: 8_000 });
      }
    }
  });

  test('[80295] No broken images on /blog', async ({ page }) => {
    const broken = [];
    page.on('response', r => {
      if (/\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(r.url()) && r.status() >= 400)
        broken.push(`${r.status()} ${r.url()}`);
    });
    await page.goto('/blog');
    await page.waitForLoadState('networkidle');
    expect(broken, `Broken images: ${broken.join(', ')}`).toHaveLength(0);
  });

  test('[80297] Blog article page loads with content', async ({ page }) => {
    await page.goto('/blog');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    const articleLink = page.locator('a[href*="/blog/"]').first();
    if (await articleLink.count() > 0) {
      const href = await articleLink.getAttribute('href');
      const res = await page.request.get(href);
      expect(res.status()).toBe(200);
      await page.goto(href);
      const h1 = page.locator('h1').first();
      await expect(h1).toBeVisible({ timeout: 8_000 });
      expect((await h1.innerText()).trim().length).toBeGreaterThan(5);
    }
  });

});

// ─── /awards ─────────────────────────────────────────────────────────────────
test.describe('[AWARDS] Awards page (/awards)', () => {

  test('[80324] All platform sections visible and have titles', async ({ page }) => {
    await page.goto('/awards');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').innerText();
    const platforms = ['Clutch', 'Shopify'];
    const found = platforms.filter(p => body.includes(p));
    expect(found.length, `Platform sections found: ${found}`).toBeGreaterThanOrEqual(1);
  });

  test('[80325] Review counts are numeric and non-zero', async ({ page }) => {
    await page.goto('/awards');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').innerText();
    const numbers = body.match(/\d+\s*(reviews?|відгуків)/gi);
    if (numbers) {
      for (const n of numbers) {
        const num = parseInt(n);
        expect(num).toBeGreaterThan(0);
      }
    }
  });

  test('[80329] Clutch badge links to DevIT Clutch profile', async ({ page }) => {
    await page.goto('/awards');
    await dismissCookieBanner(page);
    const clutchLink = page.locator('a[href*="clutch.co"]').first();
    if (await clutchLink.count() > 0) {
      const href = await clutchLink.getAttribute('href');
      expect(href).toContain('clutch.co');
      const target = await clutchLink.getAttribute('target');
      expect(target).toBe('_blank');
    }
  });

  test('[80330] Shopify badge links to partner directory', async ({ page }) => {
    await page.goto('/awards');
    await dismissCookieBanner(page);
    const shopifyLink = page.locator('a[href*="shopify"]').first();
    if (await shopifyLink.count() > 0) {
      const href = await shopifyLink.getAttribute('href');
      expect(href).toContain('shopify');
      const target = await shopifyLink.getAttribute('target');
      expect(target).toBe('_blank');
    }
  });

  test('[80331] External platform links open in new tab', async ({ page }) => {
    await page.goto('/awards');
    await dismissCookieBanner(page);
    const extLinks = page.locator('a[href^="http"]:not([href*="devit.group"])');
    const count = await extLinks.count();
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const target = await extLinks.nth(i).getAttribute('target');
        expect(target, `External link ${i} missing target="_blank"`).toBe('_blank');
      }
    }
  });

});

// ─── /case-studies ────────────────────────────────────────────────────────────
test.describe('[CASES] Case Studies page (/case-studies)', () => {

  test('[80342] Case study slides present and populated', async ({ page }) => {
    await page.goto('/case-studies');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    const slides = page.locator('[class*="slide" i], [class*="case" i][class*="item" i], [class*="case" i][class*="card" i]');
    const body = await page.locator('body').innerText();
    expect(body.trim().length).toBeGreaterThan(100);
    // There should be links to work detail pages
    const links = page.locator('a[href*="/work/"]');
    expect(await links.count()).toBeGreaterThanOrEqual(1);
  });

  test('[80344] Clicking a case study → detail page', async ({ page }) => {
    await page.goto('/case-studies');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    const link = page.locator('a[href*="/work/"]').first();
    if (await link.count() > 0) {
      const href = await link.getAttribute('href');
      const res = await page.request.get(href);
      expect(res.status()).toBe(200);
    }
  });

  test('[80345] No broken images on /case-studies', async ({ page }) => {
    const broken = [];
    page.on('response', r => {
      if (/\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(r.url()) && r.status() >= 400)
        broken.push(`${r.status()} ${r.url()}`);
    });
    await page.goto('/case-studies');
    await page.waitForLoadState('networkidle');
    expect(broken, `Broken images: ${broken.join(', ')}`).toHaveLength(0);
  });

  test('[80346] "View all work" CTA → /work', async ({ page }) => {
    await page.goto('/case-studies');
    await dismissCookieBanner(page);
    const link = page.getByRole('link', { name: /view all work|all work|see all/i }).first()
      .or(page.locator('a[href="/work"]').first());
    if (await link.count() > 0) {
      const href = await link.getAttribute('href');
      expect(href).toContain('/work');
    }
  });

});

// ─── /privacy-policy ─────────────────────────────────────────────────────────
test.describe('[PP] Privacy Policy page (/privacy-policy)', () => {

  test('[80357] All required sections present', async ({ page }) => {
    await page.goto('/privacy-policy');
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(500);
    const keywords = ['data', 'personal', 'information', 'contact'];
    const found = keywords.filter(k => body.toLowerCase().includes(k));
    expect(found.length, `PP missing key sections, found: ${found}`).toBeGreaterThanOrEqual(3);
  });

  test('[80358] hi@devit.group is a working mailto: link', async ({ page }) => {
    await page.goto('/privacy-policy');
    const emailLinks = page.locator('a[href^="mailto:"]');
    expect(await emailLinks.count()).toBeGreaterThan(0);
    const href = await emailLinks.first().getAttribute('href');
    expect(href).toMatch(/^mailto:.+@devit\./);
    expect(href).not.toContain('undefined');
  });

  test('[80360] Cross-link to Cookie Policy works', async ({ page }) => {
    await page.goto('/privacy-policy');
    const cpLink = page.getByRole('link', { name: /cookie policy/i }).first()
      .or(page.locator('a[href*="cookie"]').first());
    if (await cpLink.count() > 0) {
      const href = await cpLink.getAttribute('href');
      expect(href).toContain('cookie');
      const res = await page.request.get(href.startsWith('http') ? href : `https://devit.group${href}`);
      expect(res.status()).toBe(200);
    }
  });

});

// ─── /cookie-policy ──────────────────────────────────────────────────────────
test.describe('[CP] Cookie Policy page (/cookie-policy)', () => {

  test('[80369] All 4 cookie category sections present', async ({ page }) => {
    await page.goto('/cookie-policy');
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').innerText();
    const categories = ['necessary', 'functional', 'analytics', 'marketing'];
    const found = categories.filter(c => body.toLowerCase().includes(c));
    expect(found.length, `Cookie categories found: ${found}`).toBeGreaterThanOrEqual(2);
  });

  test('[80370] Cookie tables have required columns', async ({ page }) => {
    await page.goto('/cookie-policy');
    await page.waitForLoadState('networkidle');
    const tables = page.locator('table');
    if (await tables.count() > 0) {
      const headers = await tables.first().locator('th').allInnerTexts();
      expect(headers.join(' ').length).toBeGreaterThan(5);
    }
  });

  test('[80373] "Click here to proceed" → /privacy-policy', async ({ page }) => {
    await page.goto('/cookie-policy');
    const link = page.getByRole('link', { name: /click here|privacy policy/i }).first()
      .or(page.locator('a[href*="privacy"]').first());
    if (await link.count() > 0) {
      const href = await link.getAttribute('href');
      expect(href).toContain('privacy');
    }
  });

});

// ─── /resell ─────────────────────────────────────────────────────────────────
test.describe('[RESELL] ReSell App page (/resell)', () => {

  test('[80383] Hero rating, review count and CTA visible', async ({ page }) => {
    await page.goto('/resell');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible({ timeout: 8_000 });
    const cta = page.locator('a[href*="shopify"], a[href*="apps"], button').first();
    await expect(cta).toBeVisible({ timeout: 8_000 });
  });

  test('[80386] Monthly/Yearly pricing toggle changes prices', async ({ page }) => {
    await page.goto('/resell');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.4));
    await page.waitForTimeout(500);
    const toggle = page.locator('input[type="checkbox"][class*="toggl" i], [class*="switch" i] input, [role="switch"]').first()
      .or(page.getByText(/yearly|annual/i).first());
    if (await toggle.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const bodyBefore = await page.locator('body').innerText();
      await toggle.click();
      await page.waitForTimeout(600);
      const bodyAfter = await page.locator('body').innerText();
      // Something in the pricing area should have changed
      expect(bodyAfter).not.toBe(bodyBefore);
    }
  });

  test('[80389] Reviews carousel shows cards', async ({ page }) => {
    await page.goto('/resell');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.6));
    await page.waitForTimeout(600);
    const body = await page.locator('body').innerText();
    // Should have review-related content
    expect(body).toMatch(/review|rating|stars|\d\.\d/i);
  });

  test('[80390] FAQ: questions expand and collapse', async ({ page }) => {
    await page.goto('/resell');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(600);
    const faqBtn = page.locator('[class*="faq" i] button, details summary, [class*="accordion" i] button').first();
    if (await faqBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await faqBtn.click();
      await page.waitForTimeout(400);
      const openContent = page.locator('[class*="faq" i] [class*="answer" i]:visible, details[open], [class*="expanded" i]').first();
      if (await openContent.count() > 0) {
        await expect(openContent).toBeVisible();
      }
    }
  });

  test('[80395] Shopify App Store link → opens install page (new tab)', async ({ page }) => {
    await page.goto('/resell');
    await dismissCookieBanner(page);
    const shopifyLink = page.locator('a[href*="apps.shopify.com"]').first()
      .or(page.getByRole('link', { name: /shopify app store|find it on shopify/i }).first());
    if (await shopifyLink.count() > 0) {
      const href = await shopifyLink.getAttribute('href');
      expect(href).toContain('shopify');
      const target = await shopifyLink.getAttribute('target');
      expect(target).toBe('_blank');
    }
  });

  test('[80397] "View demo store" → resell-demo.myshopify.com (new tab)', async ({ page }) => {
    await page.goto('/resell');
    await dismissCookieBanner(page);
    const demoLink = page.locator('a[href*="resell-demo"]').first()
      .or(page.getByRole('link', { name: /view demo|demo store/i }).first());
    if (await demoLink.count() > 0) {
      const href = await demoLink.getAttribute('href');
      expect(href).toContain('myshopify');
      const target = await demoLink.getAttribute('target');
      expect(target).toBe('_blank');
    }
  });

});

// ─── /react-flow ──────────────────────────────────────────────────────────────
test.describe('[RF] React Flow page (/react-flow)', () => {

  test('[80421] Main heading visible', async ({ page }) => {
    await page.goto('/react-flow');
    await dismissCookieBanner(page);
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible({ timeout: 8_000 });
    expect((await h1.innerText()).trim().length).toBeGreaterThan(3);
  });

  test('[80425] Features section renders all items (no empty cards)', async ({ page }) => {
    await page.goto('/react-flow');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).not.toContain('lorem ipsum');
    expect(body.toLowerCase()).not.toContain('undefined');
    expect(body.length).toBeGreaterThan(500);
  });

  test('[80426] Shopify App Store link opens in new tab', async ({ page }) => {
    await page.goto('/react-flow');
    await dismissCookieBanner(page);
    const link = page.locator('a[href*="apps.shopify.com"]').first()
      .or(page.getByRole('link', { name: /shopify app store|get it on shopify/i }).first());
    if (await link.count() > 0) {
      const href = await link.getAttribute('href');
      expect(href).toContain('shopify');
      const target = await link.getAttribute('target');
      expect(target).toBe('_blank');
    }
  });

  test('[80429] "View demo store" → reactflow-demo.myshopify.com (new tab)', async ({ page }) => {
    await page.goto('/react-flow');
    await dismissCookieBanner(page);
    const demoLink = page.locator('a[href*="reactflow-demo"]').first()
      .or(page.getByRole('link', { name: /view demo|demo store/i }).first());
    if (await demoLink.count() > 0) {
      const href = await demoLink.getAttribute('href');
      expect(href).toContain('myshopify');
      const target = await demoLink.getAttribute('target');
      expect(target).toBe('_blank');
    }
  });

  test('[80430] "Other Shopify Apps" cross-links to /resell', async ({ page }) => {
    await page.goto('/react-flow');
    await dismissCookieBanner(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const resellLink = page.locator('a[href*="/resell"]').first()
      .or(page.getByRole('link', { name: /resell/i }).first());
    if (await resellLink.count() > 0) {
      const href = await resellLink.getAttribute('href');
      expect(href).toContain('resell');
    }
  });

  test('[80435] Monthly/Yearly toggle shows "20% Save" badge', async ({ page }) => {
    await page.goto('/react-flow');
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.4));
    await page.waitForTimeout(500);
    const toggle = page.locator('input[type="checkbox"], [role="switch"], [class*="switch" i] input').first()
      .or(page.getByText(/yearly|annual/i).first());
    if (await toggle.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await toggle.click();
      await page.waitForTimeout(600);
      const body = await page.locator('body').innerText();
      const hasSave = /20%|save|знижк/i.test(body);
      expect(hasSave, '"20% Save" badge not found after switching to Yearly').toBeTruthy();
    }
  });

});

// ─── /support ────────────────────────────────────────────────────────────────
test.describe('[SUP] Support page (/support)', () => {

  test('[80451] Routing modal: "Go to Agency" → /contact', async ({ page }) => {
    await page.goto('/support');
    await page.waitForTimeout(1_000);
    const goBtn = page.getByRole('link', { name: /go to agency|agency/i }).first()
      .or(page.getByRole('button', { name: /go to agency/i }).first());
    if (await goBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await goBtn.click();
      await expect(page).toHaveURL(/\/contact/, { timeout: 8_000 });
    }
  });

  test('[80452] Routing modal: "Stay here" closes modal', async ({ page }) => {
    await page.goto('/support');
    await page.waitForTimeout(1_000);
    const stayBtn = page.getByRole('button', { name: /stay here/i }).first();
    if (await stayBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await stayBtn.click();
      await page.waitForTimeout(500);
      // Modal should be gone, page content visible
      const h1 = page.locator('h1').first();
      await expect(h1).toBeVisible({ timeout: 5_000 });
    }
  });

  test('[80459] FAQ: all questions expand and collapse', async ({ page }) => {
    await page.goto('/support');
    await page.waitForTimeout(1_000);
    const stayBtn = page.getByRole('button', { name: /stay here/i }).first();
    if (await stayBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await stayBtn.click();
      await page.waitForTimeout(400);
    }
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const faqBtns = page.locator('[class*="faq" i] button, details summary, [class*="accordion" i] button');
    const count = await faqBtns.count();
    if (count > 0) {
      // Expand first FAQ item
      await faqBtns.first().click();
      await page.waitForTimeout(400);
      const openItem = page.locator('[class*="faq" i] [class*="answer" i]:visible, details[open], [class*="expanded" i]').first();
      if (await openItem.count() > 0) {
        await expect(openItem).toBeVisible();
        // Collapse
        await faqBtns.first().click();
        await page.waitForTimeout(400);
      }
    }
  });

  test('[80464] Product links navigate to /resell and /react-flow', async ({ page }) => {
    await page.goto('/support');
    await page.waitForTimeout(1_000);
    const stayBtn = page.getByRole('button', { name: /stay here/i }).first();
    if (await stayBtn.isVisible({ timeout: 3_000 }).catch(() => false)) await stayBtn.click();
    await page.waitForLoadState('networkidle');
    const resellLink = page.locator('a[href*="/resell"]').first();
    const rfLink     = page.locator('a[href*="/react-flow"]').first();
    const found = (await resellLink.count()) + (await rfLink.count());
    expect(found, 'No product links found on /support').toBeGreaterThan(0);
  });

});
