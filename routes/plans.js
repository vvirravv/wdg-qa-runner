const express = require('express');
const router = express.Router();
const plansLib = require('../lib/plans');
const runner = require('../lib/runner');
const storage = require('../lib/storage');

function generateRunId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

router.get('/', (req, res) => res.json(plansLib.listPlans()));

router.get('/available-groups', (req, res) => res.json(plansLib.AVAILABLE_GROUPS));

router.post('/', (req, res) => {
  const { name, description, browser, groups } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  const plan = plansLib.createPlan({ name: name.trim(), description, browser, groups });
  res.status(201).json(plan);
});

router.put('/:id', (req, res) => {
  const { name, description, browser, groups } = req.body;
  const plan = plansLib.updatePlan(req.params.id, { name, description, browser, groups });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
});

router.delete('/:id', (req, res) => {
  const ok = plansLib.deletePlan(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Plan not found' });
  res.json({ ok: true });
});

router.post('/:id/run', (req, res) => {
  if (runner.isRunning()) {
    return res.status(409).json({ error: 'A run is already in progress' });
  }
  const plan = plansLib.getPlan(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  if (!plan.groups || plan.groups.length === 0) {
    return res.status(400).json({ error: 'This plan has no auto-tests — it is manual only' });
  }

  const groupDefs = plansLib.AVAILABLE_GROUPS.filter(g => plan.groups.includes(g.id));
  const files = groupDefs.map(g => g.file);
  // Allow browser override from request body (Run tab selector)
  const browser = req.body.browser || plan.browser || 'all';

  const runId = generateRunId();
  runner.startRun(
    runId,
    { group: plan.name, browser, files },
    req.session.user.username
  );
  res.json({ runId });
});

module.exports = router;
