/**
 * Key pages of devit.group + Qase IDs of the templated cases for each page.
 * Templated specs (tests/templated/*) iterate over this list, so adding a page here
 * automatically adds load / SEO / SSR / responsive / cross-browser coverage.
 */
export type SitePage = {
  key: string;
  name: string;
  path: string;
  /** Text expected in the (single) H1. null = page currently has no H1 (known SEO defect) */
  h1: RegExp | null;
  /** Text expected in server-rendered HTML (SSR check without JS) */
  ssrText: RegExp;
  /** JSON-LD @type we expect at minimum (besides Organization) */
  jsonLdType?: string[];
  /** has the market badge in header (product pages use a different header) */
  productHeader?: boolean;
  qase: {
    load?: number;
    ssr?: number;
    meta?: number;
    metaDesc?: number;
    og?: number;
    jsonld?: number;
    canonical?: number;
    perf?: number;
    design?: number;
    responsive?: number;
    crossBrowser?: number;
  };
};

export const PAGES: SitePage[] = [
  {
    key: 'home', name: 'Homepage', path: '/', h1: /Digital solutions for e-business/i, ssrText: /Digital solutions/i,
    jsonLdType: ['Organization', 'WebSite'],
    qase: { load: 25232, ssr: 25248, meta: 25252, jsonld: 25250, perf: 25251, design: 25261, responsive: 25262, crossBrowser: 25263 },
  },
  {
    key: 'work', name: 'Work', path: '/work', h1: /Our Works/i, ssrText: /Our Works/i,
    jsonLdType: ['ItemList', 'CollectionPage'],
    qase: { load: 25264, ssr: 25281, meta: 25282, jsonld: 25283, perf: 25284, canonical: 25285, design: 25287, responsive: 25288, crossBrowser: 25289 },
  },
  {
    key: 'project', name: 'Project Detail', path: '/work/real-americas-voice', h1: /Real America.s Voice/i, ssrText: /Real America/i,
    jsonLdType: ['CreativeWork', 'BreadcrumbList'],
    qase: { load: 25290, ssr: 25305, meta: 25306, jsonld: 25307, perf: 25308, canonical: 25309, design: 25310, responsive: 25311, crossBrowser: 25312 },
  },
  {
    key: 'contact', name: 'Contact', path: '/contact', h1: /Drop us a line/i, ssrText: /Drop us a line/i,
    jsonLdType: ['ContactPage', 'Organization'],
    qase: { load: 25313, ssr: 25323, meta: 25324, jsonld: 25325, perf: 25326, canonical: 25327, design: 25328, responsive: 25329, crossBrowser: 25330 },
  },
  {
    key: 'shopify', name: 'Shopify', path: '/shopify', h1: /Build the Next Standout Shopify Store/i, ssrText: /Shopify/i,
    jsonLdType: ['Service'],
    qase: { load: 25331, ssr: 25347, meta: 25348, jsonld: 25349, perf: 25350, canonical: 25351, design: 25360, responsive: 25361, crossBrowser: 25362 },
  },
  {
    key: 'about', name: 'About', path: '/about', h1: /We are DevIT/i, ssrText: /We are DevIT/i,
    jsonLdType: ['AboutPage', 'Organization'],
    qase: { load: 25363, ssr: 25377, meta: 25378, jsonld: 25379, perf: 25380, canonical: 25381, design: 25382, responsive: 25383, crossBrowser: 25384 },
  },
  {
    key: 'calculator', name: 'Calculator', path: '/calculator', h1: /Estimate the cost/i, ssrText: /Estimate the cost/i,
    jsonLdType: ['WebApplication', 'Service'],
    qase: { load: 25385, ssr: 25399, meta: 25400, jsonld: 25401, perf: 25402, canonical: 25403, design: 25404, responsive: 25405, crossBrowser: 25406 },
  },
  {
    key: 'blog', name: 'Blog', path: '/blog', h1: /Our Blog/i, ssrText: /Our Blog/i,
    jsonLdType: ['Blog', 'CollectionPage'],
    qase: { load: 25407, ssr: 25415, meta: 25416, jsonld: 25417, perf: 25418, canonical: 25419, design: 25420, responsive: 25421, crossBrowser: 25422 },
  },
  {
    key: 'article', name: 'Blog Article', path: '/blog/how-we-use-ai-in-devit', h1: /How We Use AI in DevIT/i, ssrText: /How We Use AI/i,
    jsonLdType: ['BlogPosting', 'Article'],
    qase: { load: 25423, ssr: 25430, meta: 25431, jsonld: 25432, og: 25433, canonical: 25434, design: 25435, responsive: 25436, crossBrowser: 25437 },
  },
  {
    key: 'awards', name: 'Awards', path: '/awards', h1: /Awards|Achievements|Recognitions/i, ssrText: /Clutch|Awards/i,
    qase: { load: 25438, ssr: 25448, meta: 25449, jsonld: 25450, perf: 25451, canonical: 25452, design: 25453, responsive: 25454, crossBrowser: 25455 },
  },
  {
    key: 'case-studies', name: 'Case Studies', path: '/case-studies', h1: /Case studies/i, ssrText: /Real America.s Voice/i,
    qase: { load: 25456, ssr: 25463, meta: 25464, jsonld: 25465, perf: 25466, canonical: 25467, design: 25468, responsive: 25469, crossBrowser: 25470 },
  },
  {
    key: 'privacy', name: 'Privacy Policy', path: '/privacy-policy', h1: /Privacy Policy/i, ssrText: /Privacy Policy/i,
    qase: { load: 25471, ssr: 25476, meta: 25477, jsonld: 25478, perf: 25479, canonical: 25480, responsive: 25481, crossBrowser: 25482 },
  },
  {
    key: 'cookie', name: 'Cookie Policy', path: '/cookie-policy', h1: /Cookie Policy/i, ssrText: /Cookie Policy/i,
    qase: { load: 25483, ssr: 25490, meta: 25491, jsonld: 25492, perf: 25493, canonical: 25494, responsive: 25495, crossBrowser: 25496 },
  },
  {
    key: 'resell', name: 'ReSell', path: '/resell', h1: /Post-Purchase upsell/i, ssrText: /ReSell/i, productHeader: true,
    jsonLdType: ['SoftwareApplication'],
    qase: { load: 25497, ssr: 25519, meta: 25520, jsonld: 25522, perf: 25523, canonical: 25524, design: 25526, responsive: 25525, crossBrowser: 25527 },
  },
  {
    key: 'react-flow', name: 'React Flow', path: '/react-flow', h1: /Workflows for Your Store/i, ssrText: /React Flow/i, productHeader: true,
    jsonLdType: ['SoftwareApplication'],
    qase: { load: 25533, ssr: 25551, meta: 25552, metaDesc: 25553, og: 25554, jsonld: 25555, perf: 25556, canonical: 25557, design: 25558, responsive: 25559, crossBrowser: 25560 },
  },
  {
    key: 'support', name: 'Support', path: '/support', h1: /We'll sort it out/i, ssrText: /sort it out/i,
    qase: { load: 25561, ssr: 25574, meta: 25575, metaDesc: 25576, og: 25577, jsonld: 25578, perf: 25579, canonical: 25580, design: 25581, responsive: 25582, crossBrowser: 25583 },
  },
];

export const pageByKey = (key: string): SitePage => {
  const p = PAGES.find((x) => x.key === key);
  if (!p) throw new Error(`Unknown page key ${key}`);
  return p;
};

/** Pages that must contain the global header market badge / footer tel: link etc. */
export const ALL_PATHS = PAGES.map((p) => p.path);

export const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
} as const;
