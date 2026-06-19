const { spawn } = require('child_process');
const path = require('path');
const storage = require('./storage');

const TESTS_DIR = path.join(__dirname, '../tests');

let currentRun = null;
let sseClients = [];

function startRun(runId, { group, browser, files }, triggeredBy) {
  const args = ['playwright', 'test', '--reporter=line', '--timeout=60000'];

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
    storage.finishRun(runId, {
      status: code === 0 ? 'passed' : 'failed',
      output,
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
