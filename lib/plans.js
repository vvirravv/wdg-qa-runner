const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../data/plans.json');

const AVAILABLE_GROUPS = [
  {
    id: 'global',
    label: 'Global Tests',
    desc: 'Footer, Cookie Banner, Security, A11Y, Forms, Market Badge',
    file: 'tests/global/global.spec.js',
    tests: [
      '[1794] Footer',
      '[1795] Cookie Banner & Consent',
      '[1802] Security',
      '[1803] Accessibility (A11Y)',
      '[1804] Error Handling',
      '[4908] Forms — Global',
      '[2973] Market Badge',
    ],
  },
  {
    id: 'header',
    label: 'Header & Navigation',
    desc: 'Header nav, Mobile navigation (≤768px)',
    file: 'tests/global/header.spec.js',
    tests: [
      '[1793] Header & Navigation',
      '[3000] Mobile Navigation (≤768px)',
    ],
  },
  {
    id: 'homepage',
    label: 'Homepage',
    desc: 'Homepage (/) — hero, sections, CTA',
    file: 'tests/pages/homepage.spec.js',
    tests: [
      '[1809] Homepage (/)',
    ],
  },
  {
    id: 'pages',
    label: 'Content Pages',
    desc: 'About, Blog, Awards, Case Studies, Calculator, ReSell, Support…',
    file: 'tests/pages/remaining-pages.spec.js',
    tests: [
      '[1896] About Page (/about)',
      '[1910] Calculator Page (/calculator)',
      '[1921] Blog (/blog)',
      '[1932] Awards Page (/awards)',
      '[1943] Case Studies (/case-studies)',
      '[1954] Cookie Policy (/cookie-policy)',
      '[1963] Privacy Policy (/privacy-policy)',
      '[1972] ReSell App Page (/resell)',
      '[3083] React Flow App Page (/react-flow)',
      '[3087] Support Page (/support)',
      '[1832] Work Page (/work)',
      '[1848] Project Detail (/work/{slug})',
    ],
  },
  {
    id: 'work-contact',
    label: 'Work / Contact / Shopify',
    desc: 'Work page, Contact form, Shopify landing',
    file: 'tests/pages/work-contact-shopify.spec.js',
    tests: [
      '[1864] Contact Page (/contact)',
      '[1880] Shopify Page (/shopify)',
    ],
  },
];

const DEFAULT_PLANS = [
  {
    id: 'smoke',
    name: 'Smoke',
    description: 'Мінімальна перевірка після будь-якого деплою — сайт відповідає, навігація працює.',
    browser: 'chrome',
    groups: ['homepage', 'header'],
  },
  {
    id: 'sanity-after-deploy',
    name: 'Sanity — After Deploy',
    description: 'Ключові сторінки після кожного деплою. Запускати автоматично.',
    browser: 'chrome',
    groups: ['homepage', 'header', 'global'],
  },
  {
    id: 'design',
    name: 'Design',
    description: 'Візуальна перевірка дизайну — ручні тести (автотести не передбачені).',
    browser: 'chrome',
    groups: [],
  },
  {
    id: 'responsive',
    name: 'Responsive',
    description: 'Мобільна навігація і адаптивна верстка.',
    browser: 'all',
    groups: ['header'],
  },
  {
    id: 'strapi',
    name: 'Strapi',
    description: 'Цілісність контенту з CMS — ручна перевірка (автотести не передбачені).',
    browser: 'chrome',
    groups: [],
  },
  {
    id: 'cross-browser',
    name: 'Cross-Browser',
    description: 'Повний набір тестів на Chrome та Firefox одночасно.',
    browser: 'all',
    groups: ['global', 'header', 'homepage', 'pages', 'work-contact'],
  },
  {
    id: 'sanity-deploy-alias',
    name: 'Sanity — After Deploy',
    description: 'Дублікат для розкладу — запускається окремим тригером.',
    browser: 'chrome',
    groups: ['homepage', 'header', 'global'],
  },
  {
    id: 'accessibility',
    name: 'Accessibility',
    description: 'A11Y перевірки: ролі, ARIA-атрибути, контраст, фокус.',
    browser: 'all',
    groups: ['global'],
  },
  {
    id: 'regression',
    name: 'Regression Full Site',
    description: 'Повна регресія — всі сторінки, всі тести.',
    browser: 'all',
    groups: ['global', 'header', 'homepage', 'pages', 'work-contact'],
  },
  {
    id: 'seo',
    name: 'SEO Screaming Frog',
    description: 'SEO аудит через Screaming Frog — ручна перевірка (автотести не передбачені).',
    browser: 'chrome',
    groups: [],
  },
  {
    id: 'cookie-consent',
    name: 'Cookie Consent',
    description: 'Поведінка Cookie Banner і flow отримання згоди.',
    browser: 'chrome',
    groups: ['global'],
  },
  {
    id: 'security',
    name: 'Security & Infrastructure',
    description: 'Security headers, HTTPS redirect, вразливості.',
    browser: 'chrome',
    groups: ['global'],
  },
];

function load() {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return data;
  } catch {
    const seeded = DEFAULT_PLANS.map(p => ({
      ...p,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    save(seeded);
    return seeded;
  }
}

function save(plans) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(plans, null, 2));
}

function listPlans() {
  return load();
}

function getPlan(id) {
  return load().find(p => p.id === id) || null;
}

function createPlan({ name, description, browser, groups }) {
  const plans = load();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const id = slug + '-' + Date.now().toString(36);
  const plan = {
    id,
    name,
    description: description || '',
    browser: browser || 'all',
    groups: groups || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  plans.push(plan);
  save(plans);
  return plan;
}

function updatePlan(id, { name, description, browser, groups }) {
  const plans = load();
  const plan = plans.find(p => p.id === id);
  if (!plan) return null;
  if (name !== undefined)        plan.name        = name;
  if (description !== undefined) plan.description = description;
  if (browser !== undefined)     plan.browser     = browser;
  if (groups !== undefined)      plan.groups      = groups;
  plan.updatedAt = new Date().toISOString();
  save(plans);
  return plan;
}

function deletePlan(id) {
  const plans = load();
  const idx = plans.findIndex(p => p.id === id);
  if (idx === -1) return false;
  plans.splice(idx, 1);
  save(plans);
  return true;
}

module.exports = { listPlans, getPlan, createPlan, updatePlan, deletePlan, AVAILABLE_GROUPS };
