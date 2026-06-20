const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const router = express.Router();

const FILE = path.join(__dirname, '../data/autotests.json');
const TESTS_DIR = path.join(__dirname, '../tests');

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return []; }
}

function save(list) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function defaultCode(name) {
  return `const { test, expect } = require('@playwright/test');

test('${name}', async ({ page }) => {
  // TODO: implement your test
  await page.goto('https://wearetheguild.co/');
  await expect(page).toHaveTitle(/Guild/i);
});
`;
}

// GET /api/autotests
router.get('/', (req, res) => res.json(load()));

// POST /api/autotests
router.post('/', (req, res) => {
  const { name, description, code, language } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  const list = load();
  const entry = {
    id: genId(),
    name: name.trim(),
    description: description || '',
    code: code || defaultCode(name.trim()),
    language: language || 'javascript',
    linkedPlans: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  list.unshift(entry);
  save(list);
  res.status(201).json(entry);
});

// GET /api/autotests/:id
router.get('/:id', (req, res) => {
  const t = load().find(t => t.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});

// PUT /api/autotests/:id
router.put('/:id', (req, res) => {
  const list = load();
  const idx = list.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const { name, description, code, language, linkedPlans } = req.body;
  const t = list[idx];
  if (name !== undefined) t.name = name;
  if (description !== undefined) t.description = description;
  if (code !== undefined) t.code = code;
  if (language !== undefined) t.language = language;
  if (linkedPlans !== undefined) t.linkedPlans = linkedPlans;
  t.updatedAt = new Date().toISOString();
  save(list);
  res.json(t);
});

// DELETE /api/autotests/:id
router.delete('/:id', (req, res) => {
  const list = load();
  const idx = list.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  list.splice(idx, 1);
  save(list);
  res.json({ ok: true });
});

// POST /api/autotests/:id/run
router.post('/:id/run', async (req, res) => {
  const t = load().find(t => t.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });

  const tmpFile = path.join(os.tmpdir(), `at-${t.id}-${Date.now()}.spec.js`);

  try {
    fs.writeFileSync(tmpFile, t.code);

    const result = await new Promise((resolve) => {
      const proc = spawn('npx', ['playwright', 'test', tmpFile, '--reporter=list', '--timeout=30000'], {
        cwd: TESTS_DIR,
        env: { ...process.env, CI: '1', FORCE_COLOR: '0' },
      });

      let output = '';
      proc.stdout.on('data', d => { output += d.toString(); });
      proc.stderr.on('data', d => { output += d.toString(); });

      const timer = setTimeout(() => {
        proc.kill();
        resolve({ exitCode: -1, output: output + '\n[Timeout exceeded]', status: 'timeout' });
      }, 60000);

      proc.on('close', (code) => {
        clearTimeout(timer);
        resolve({ exitCode: code, output, status: code === 0 ? 'passed' : 'failed' });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({ exitCode: -1, output: err.message, status: 'error' });
      });
    });

    res.json(result);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
});

module.exports = router;
