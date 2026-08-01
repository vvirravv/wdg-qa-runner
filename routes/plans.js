const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const plansLib = require('../lib/plans');
const runner = require('../lib/runner');
const requireAdmin = require('../middleware/requireAdmin');

const AUTOTESTS_FILE = path.join(__dirname, '../data/autotests.json');

function loadAutotests() {
  try { return JSON.parse(fs.readFileSync(AUTOTESTS_FILE, 'utf8')); }
  catch { return []; }
}

function generateRunId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

router.get('/', (req, res) => res.json(plansLib.listPlans()));

router.get('/:id', (req, res) => {
  const plan = plansLib.getPlan(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
});

router.post('/', requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  res.status(201).json(plansLib.createPlan({ name }));
});

router.post('/import', requireAdmin, (req, res) => {
  const { suites } = req.body;
  if (!Array.isArray(suites) || !suites.length) return res.status(400).json({ error: 'No suites provided' });
  let created = 0;
  for (const suite of suites) {
    if (!suite.name?.trim()) continue;
    plansLib.createPlan({ name: suite.name.trim(), testCases: suite.testCases || [] });
    created++;
  }
  res.json({ ok: true, created });
});

router.put('/:id', requireAdmin, (req, res) => {
  const { name, autotestIds } = req.body;
  const plan = plansLib.updatePlan(req.params.id, { name, autotestIds });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
});

router.delete('/:id', requireAdmin, (req, res) => {
  if (!plansLib.deletePlan(req.params.id)) return res.status(404).json({ error: 'Plan not found' });
  res.json({ ok: true });
});

router.post('/:id/run', (req, res) => {
  if (runner.isRunning()) return res.status(409).json({ error: 'A run is already in progress' });
  const plan = plansLib.getPlan(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  if (!plan.autotestIds?.length) return res.status(400).json({ error: 'Plan has no autotests' });

  const allAutotests = loadAutotests();
  const autotests = plan.autotestIds.map(id => allAutotests.find(t => t.id === id)).filter(Boolean);
  if (!autotests.length) return res.status(400).json({ error: 'No matching autotests found' });

  const headed = !!req.body.headed;
  const runId = generateRunId();
  runner.startPlanRun(runId, { planName: plan.name, autotests, headed }, req.session.user.username);
  res.json({ runId });
});

module.exports = router;
