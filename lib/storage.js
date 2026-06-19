const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../data/runs.json');
const MAX_RUNS = 30;

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return [];
  }
}

function save(runs) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(runs, null, 2));
}

function createRun({ runId, group, browser, triggeredBy }) {
  const runs = load();
  const run = {
    id: runId,
    group: group || 'all',
    browser: browser || 'all',
    triggeredBy,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    status: 'running',
    total: 0,
    passed: 0,
    failed: 0,
    duration: null,
    output: '',
  };
  runs.unshift(run);
  save(runs.slice(0, MAX_RUNS));
  return run;
}

function finishRun(runId, { status, output, total, passed, failed, duration }) {
  const runs = load();
  const run = runs.find(r => r.id === runId);
  if (run) {
    Object.assign(run, {
      status,
      output,
      total,
      passed,
      failed,
      duration,
      finishedAt: new Date().toISOString(),
    });
    save(runs);
  }
}

function listRuns() {
  return load().map(({ output, ...rest }) => rest);
}

function getRun(runId) {
  return load().find(r => r.id === runId) || null;
}

module.exports = { createRun, finishRun, listRuns, getRun };
