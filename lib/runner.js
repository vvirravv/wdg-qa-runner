const { spawn } = require('child_process');
const path = require('path');
const storage = require('./storage');

const TESTS_DIR = path.join(__dirname, '../tests');

let currentRun = null;
let sseClients = [];

function startRun(runId, { group, browser, files }, triggeredBy) {
  const args = ['playwright', 'test', '--reporter=list', '--timeout=60000'];

  if (files && files.length > 0) args.push(...files);
  if (browser === 'chrome') args.push('--project=desktop-chrome');
  if (browser === 'firefox') args.push('--project=desktop-firefox');

  storage.createRun({ runId, group, browser, triggeredBy });

  const proc = spawn('npx', args, {
    cwd: TESTS_DIR,
    env: { ...process.env, CI: '1', FORCE_COLOR: '0' },
  });

  currentRun = { runId, process: proc, outputLines: [] };

  proc.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    currentRun.outputLines.push(text);
    broadcast(text);
  });

  proc.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    currentRun.outputLines.push(text);
    broadcast(text);
  });

  proc.on('close', (code) => {
    const output = currentRun.outputLines.join('').slice(0, 500_000);
    const stats = parseStats(output);
    const results = parseTestResults(output);
    storage.finishRun(runId, {
      status: code === 0 ? 'passed' : 'failed',
      output,
      results,
      ...stats,
    });
    broadcastDone();
    currentRun = null;
  });

  proc.on('error', (err) => {
    const text = `\n[Runner error]: ${err.message}\n`;
    if (currentRun) { currentRun.outputLines.push(text); broadcast(text); }
  });
}

function parseStats(output) {
  const match = output.match(/(\d+) passed(?:, (\d+) failed)? \((.+?)\)/);
  if (!match) return { total: 0, passed: 0, failed: 0, duration: '?' };
  const passed = parseInt(match[1], 10);
  const failed = parseInt(match[2] || '0', 10);
  return { total: passed + failed, passed, failed, duration: match[3] };
}

function parseTestResults(output) {
  const results = [];
  for (const line of output.split('\n')) {
    // Playwright list reporter: "  ✓  [chromium] › file.spec.js:8:3 › Test title (1234ms)"
    const statusMatch = line.match(/^\s+([✓✗×✘])\s+(.*)/);
    if (!statusMatch) continue;

    const statusChar = statusMatch[1];
    let rest = statusMatch[2];
    if (!rest.includes('›')) continue;

    // Remove optional leading test number (list reporter)
    rest = rest.replace(/^\d+\s+/, '');

    // Extract [browser] › ...
    const browserMatch = rest.match(/^\[([^\]]+)\]\s+›\s+(.*)/);
    if (!browserMatch) continue;

    const browser = browserMatch[1];
    let path = browserMatch[2];

    // Remove "file.spec.js:line:col › " prefix if present
    path = path.replace(/^[^\s]+\.spec\.[jt]s:\d+:\d+\s+›\s+/, '');

    // Extract and strip duration "(1234ms)" or "(1.2s)"
    const durMatch = path.match(/\s+\((\d+(?:\.\d+)?(?:ms|s|m))\)\s*$/);
    const duration = durMatch ? durMatch[1] : '';
    path = path.replace(/\s+\(\d+(?:\.\d+)?(?:ms|s|m)\)\s*$/, '').trim();

    if (!path) continue;
    results.push({
      status: statusChar === '✓' ? 'passed' : 'failed',
      title: path,
      browser,
      duration,
    });
  }
  return results;
}

function broadcast(text) {
  const payload = `data: ${JSON.stringify(text)}\n\n`;
  sseClients.forEach(res => { try { res.write(payload); } catch (_) {} });
}

function broadcastDone() {
  sseClients.forEach(res => {
    try { res.write('data: [DONE]\n\n'); res.end(); } catch (_) {}
  });
  sseClients = [];
}

function addSseClient(res) {
  sseClients.push(res);
  if (currentRun && currentRun.outputLines.length > 0) {
    const buffered = currentRun.outputLines.join('');
    try { res.write(`data: ${JSON.stringify(buffered)}\n\n`); } catch (_) {}
  }
}

function removeSseClient(res) {
  sseClients = sseClients.filter(c => c !== res);
}

function isRunning() { return currentRun !== null; }
function getCurrentRunId() { return currentRun?.runId ?? null; }

module.exports = { startRun, addSseClient, removeSseClient, isRunning, getCurrentRunId };
