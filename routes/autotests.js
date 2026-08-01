const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const router = express.Router();
const requireAdmin = require('../middleware/requireAdmin');
const requireAutotestAccess = require('../middleware/requireAutotestAccess');

const FILE = path.join(__dirname, '../data/autotests.json');
const TESTS_DIR = path.join(__dirname, '../tests');
const SPECS_DIR = path.join(TESTS_DIR, 'tests');

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
router.get('/', requireAutotestAccess, (req, res) => res.json(load()));

// POST /api/autotests
router.post('/', requireAdmin, (req, res) => {
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
router.get('/:id', requireAutotestAccess, (req, res) => {
  const t = load().find(t => t.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});

// PUT /api/autotests/:id
router.put('/:id', requireAdmin, (req, res) => {
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
router.delete('/:id', requireAdmin, (req, res) => {
  const list = load();
  const idx = list.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  list.splice(idx, 1);
  save(list);
  res.json({ ok: true });
});

// GET /api/autotests/:id/video — serves recorded .webm video
router.get('/:id/video', requireAutotestAccess, (req, res) => {
  const t = load().find(t => t.id === req.params.id);
  if (!t || !t.lastRun?.videoFile) return res.status(404).json({ error: 'No video' });
  const vpath = t.lastRun.videoFile;
  if (!fs.existsSync(vpath)) return res.status(404).json({ error: 'Video file not found' });
  const stat = fs.statSync(vpath);
  res.setHeader('Content-Type', 'video/webm');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Accept-Ranges', 'bytes');
  fs.createReadStream(vpath).pipe(res);
});

// POST /api/autotests/:id/run  — streams SSE: {type:'output',text} then {type:'done',status,output,exitCode,videoFile}
router.post('/:id/run', requireAutotestAccess, (req, res) => {
  const t = load().find(t => t.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (obj) => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(obj)}\n\n`); };

  const headed = !!req.body?.headed;
  const extraArgs = headed ? ['--headed'] : [];
  const env = { ...process.env, FORCE_COLOR: '0', ...(headed ? { PW_SLOW_MO: '800' } : { CI: '1' }) };

  // Per-run video output directory
  const videoDir = path.join(__dirname, '../at-videos', req.params.id);
  try { fs.rmSync(videoDir, { recursive: true, force: true }); } catch {}
  fs.mkdirSync(videoDir, { recursive: true });

  // Find first .webm recorded by Playwright
  const findVideo = (dir) => {
    if (!fs.existsSync(dir)) return null;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) { const f = findVideo(path.join(dir, entry.name)); if (f) return f; }
      else if (entry.name.endsWith('.webm') || entry.name.endsWith('.mp4')) return path.join(dir, entry.name);
    }
    return null;
  };

  let args, tmpFile = null;
  const videoArgs = ['--video=on', `--output=${videoDir}`];
  if (t.specFile && t.testName) {
    const grepPattern = t.testName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    args = ['playwright', 'test', `tests/${t.specFile}`, '--grep', grepPattern,
      ...videoArgs, ...extraArgs, '--reporter=list', '--timeout=30000'];
  } else if (t.specFile) {
    args = ['playwright', 'test', `tests/${t.specFile}`,
      ...videoArgs, ...extraArgs, '--reporter=list', '--timeout=45000'];
  } else {
    const tmpName = `_at_${t.id}_${Date.now()}.spec.js`;
    tmpFile = path.join(SPECS_DIR, tmpName);
    fs.writeFileSync(tmpFile, t.code);
    args = ['playwright', 'test', `tests/${tmpName}`,
      ...videoArgs, ...extraArgs, '--reporter=list', '--timeout=30000'];
  }

  const proc = spawn('npx', args, { cwd: TESTS_DIR, env });
  let fullOutput = '';

  const cleanup = () => { if (tmpFile) try { fs.unlinkSync(tmpFile); } catch {} };

  proc.stdout.on('data', d => { const text = d.toString(); fullOutput += text; send({ type: 'output', text }); });
  proc.stderr.on('data', d => { const text = d.toString(); fullOutput += text; send({ type: 'output', text }); });

  const saveLastRun = (status, videoFile) => {
    try {
      const list = load();
      const idx = list.findIndex(x => x.id === req.params.id);
      if (idx !== -1) {
        list[idx].lastRun = { status, time: new Date().toISOString(), output: fullOutput.slice(-40000), videoFile: videoFile || null };
        save(list);
      }
    } catch {}
  };

  const timer = setTimeout(() => {
    proc.kill();
    const videoFile = findVideo(videoDir);
    saveLastRun('timeout', videoFile);
    send({ type: 'done', status: 'timeout', output: fullOutput + '\n[Timeout exceeded]', exitCode: -1, videoFile: videoFile || null });
    cleanup(); res.end();
  }, 60000);

  proc.on('close', code => {
    clearTimeout(timer);
    const status = code === 0 ? 'passed' : 'failed';
    const videoFile = findVideo(videoDir);
    saveLastRun(status, videoFile);
    send({ type: 'done', status, output: fullOutput, exitCode: code, videoFile: videoFile || null });
    cleanup(); res.end();
  });

  proc.on('error', err => {
    clearTimeout(timer);
    saveLastRun('error', null);
    send({ type: 'done', status: 'error', output: err.message, exitCode: -1, videoFile: null });
    cleanup(); res.end();
  });

  req.on('close', () => { proc.kill(); clearTimeout(timer); cleanup(); });
});

module.exports = router;
