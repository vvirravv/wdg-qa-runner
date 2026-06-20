const express = require('express');
const runner = require('../lib/runner');
const storage = require('../lib/storage');
const router = express.Router();

const GROUPS = {
  all:      { label: 'All Tests',           files: [] },
  global:   { label: 'Global',              files: ['tests/global/global.spec.js'] },
  header:   { label: 'Header & Nav',        files: ['tests/global/header.spec.js'] },
  homepage: { label: 'Homepage',            files: ['tests/pages/homepage.spec.js'] },
  pages:    { label: 'Pages',               files: ['tests/pages/remaining-pages.spec.js', 'tests/pages/work-contact-shopify.spec.js'] },
};

const BROWSERS = ['all', 'chrome', 'firefox'];

function generateRunId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

router.get('/me', (req, res) => {
  res.json({
    username: req.session.user?.username || '—',
    role: req.session.user?.role || 'user',
  });
});

router.get('/run/status', (req, res) => {
  res.json({ running: runner.isRunning(), runId: runner.getCurrentRunId() });
});

router.get('/groups', (req, res) => {
  res.json(Object.entries(GROUPS).map(([id, g]) => ({ id, label: g.label })));
});

router.post('/run', (req, res) => {
  if (runner.isRunning()) {
    return res.status(409).json({ error: 'A run is already in progress' });
  }

  const group = req.body.group || 'all';
  const browser = req.body.browser || 'all';

  if (!GROUPS[group]) {
    return res.status(400).json({ error: `Invalid group. Use: ${Object.keys(GROUPS).join(', ')}` });
  }
  if (!BROWSERS.includes(browser)) {
    return res.status(400).json({ error: 'Invalid browser. Use: all, chrome, firefox' });
  }

  const runId = generateRunId();
  runner.startRun(runId, { group, browser, files: GROUPS[group].files }, req.session.user.username);
  res.json({ runId });
});

router.get('/run/stream', (req, res) => {
  if (!runner.isRunning()) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write('data: [IDLE]\n\n');
    res.end();
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  runner.addSseClient(res);
  req.on('close', () => runner.removeSseClient(res));
});

router.get('/runs', (req, res) => res.json(storage.listRuns()));

router.get('/runs/:runId', (req, res) => {
  const run = storage.getRun(req.params.runId);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.json(run);
});

module.exports = router;
