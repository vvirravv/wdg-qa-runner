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
    review: 0,
    duration: null,
    output: '',
    results: [],
  };
  runs.unshift(run);
  save(runs.slice(0, MAX_RUNS));
  return run;
}

function finishRun(runId, { status, output, total, passed, failed, review, duration, results, videos }) {
  const runs = load();
  const run = runs.find(r => r.id === runId);
  if (run) {
    Object.assign(run, {
      status,
      output,
      total,
      passed,
      failed,
      review: review || 0,
      duration,
      results: results || [],
      videos: videos || [],
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

function deleteRun(runId) {
  const runs = load();
  const idx = runs.findIndex(r => r.id === runId);
  if (idx === -1) return false;
  runs.splice(idx, 1);
  save(runs);
  return true;
}

function clearRuns() {
  save([]);
  return true;
}

module.exports = { createRun, finishRun, listRuns, getRun, deleteRun, clearRuns };
