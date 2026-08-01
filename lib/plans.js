const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../data/plans.json');

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return []; }
}

function save(plans) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(plans, null, 2));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function listPlans() { return load(); }
function getPlan(id) { return load().find(p => p.id === id) || null; }

function createPlan({ name, testCases = [] }) {
  const plans = load();
  const plan = {
    id: genId(),
    name: name.trim(),
    autotestIds: [],
    testCases,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  plans.push(plan);
  save(plans);
  return plan;
}

function updatePlan(id, { name, autotestIds, testCases }) {
  const plans = load();
  const plan = plans.find(p => p.id === id);
  if (!plan) return null;
  if (name !== undefined) plan.name = name.trim();
  if (autotestIds !== undefined) plan.autotestIds = autotestIds;
  if (testCases !== undefined) plan.testCases = testCases;
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

module.exports = { listPlans, getPlan, createPlan, updatePlan, deletePlan };
