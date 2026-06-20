const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const SPEC_FILES = [
  { file: 'tests/tests/global/global.spec.js',              group: 'Global Tests' },
  { file: 'tests/tests/global/header.spec.js',              group: 'Header & Navigation' },
  { file: 'tests/tests/pages/homepage.spec.js',             group: 'Homepage' },
  { file: 'tests/tests/pages/remaining-pages.spec.js',      group: 'Content Pages' },
  { file: 'tests/tests/pages/work-contact-shopify.spec.js', group: 'Work / Contact / Shopify' },
];

const CUSTOM_FILE = path.join(__dirname, '../data/custom-tests.json');

function parseSpecFile(filePath, groupLabel) {
  const abs = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(abs)) return [];
  const src = fs.readFileSync(abs, 'utf8');
  const results = [];

  // Extract describe block name(s)
  const describeRe = /describe\(['"`]([^'"`]+)['"`]/g;
  let describeNames = [];
  let m;
  while ((m = describeRe.exec(src)) !== null) describeNames.push(m[1]);

  // Extract all test() calls
  const testRe = /^\s*test\(['"`]([^'"`]+)['"`]/gm;
  let t;
  while ((t = testRe.exec(src)) !== null) {
    const title = t[1];
    const idMatch = title.match(/^\[(\d+)\]/);
    results.push({
      id: idMatch ? idMatch[1] : null,
      title,
      name: idMatch ? title.replace(/^\[\d+\]\s*/, '') : title,
      group: groupLabel,
      describe: describeNames[0] || groupLabel,
      source: 'spec',
    });
  }
  return results;
}

function loadCustom() {
  try { return JSON.parse(fs.readFileSync(CUSTOM_FILE, 'utf8')); }
  catch { return []; }
}
function saveCustom(list) {
  fs.mkdirSync(path.dirname(CUSTOM_FILE), { recursive: true });
  fs.writeFileSync(CUSTOM_FILE, JSON.stringify(list, null, 2));
}

// GET /api/tests — all spec tests + custom tests
router.get('/', (req, res) => {
  const specTests = SPEC_FILES.flatMap(s => parseSpecFile(s.file, s.group));
  const custom = loadCustom();
  res.json([...specTests, ...custom]);
});

// POST /api/tests — add a custom test entry
router.post('/', (req, res) => {
  const { title, group, describe: desc, notes } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title required' });
  const custom = loadCustom();
  const entry = {
    id: null,
    title: title.trim(),
    name: title.trim(),
    group: group || 'Custom',
    describe: desc || group || 'Custom',
    notes: notes || '',
    source: 'custom',
    createdAt: new Date().toISOString(),
  };
  custom.push(entry);
  saveCustom(custom);
  res.status(201).json(entry);
});

// DELETE /api/tests/custom/:idx — remove a custom test by index
router.delete('/custom/:idx', (req, res) => {
  const custom = loadCustom();
  const idx = parseInt(req.params.idx, 10);
  if (isNaN(idx) || idx < 0 || idx >= custom.length) return res.status(404).json({ error: 'Not found' });
  custom.splice(idx, 1);
  saveCustom(custom);
  res.json({ ok: true });
});

module.exports = router;
