const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const storage = require('./storage');

const TESTS_DIR = path.join(__dirname, '../tests');
const VISUAL_DIFFS_DIR = path.join(__dirname, '../public/visual-diffs');
const PLAN_VIDEOS_DIR = path.join(__dirname, '../public/plan-videos');

function findAllVideos(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findAllVideos(full));
    else if (entry.name.endsWith('.webm') || entry.name.endsWith('.mp4')) results.push(full);
  }
  return results;
}

let currentRun = null;
let sseClients = [];

function _launch(runId, args, env, group, browser, triggeredBy, videoDir) {
  storage.createRun({ runId, group, browser, triggeredBy });
  const proc = spawn('npx', args, { cwd: TESTS_DIR, env });
  currentRun = { runId, process: proc, outputLines: [], videoDir: videoDir || null };

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
    const vdir = currentRun.videoDir;
    const videos = vdir ? findAllVideos(vdir).map(f => '/plan-videos/' + path.relative(PLAN_VIDEOS_DIR, f)) : [];

    const visualDiffs = parseVisualDiffs(output);
    const noBaselineDiffs = parseNoBaselineDiffs(output);
    let trueFailed = 0;
    let review = 0;
    for (const r of results) {
      if (r.status !== 'failed') continue;
      const d = visualDiffs[r.title];
      const nb = noBaselineDiffs[r.title];
      if (d) {
        r.status = 'design-mismatch';
        r.visualDiff = {
          message: buildVisualMessage(d),
          expectedSize: `${d.expectedWidth}×${d.expectedHeight}`,
          actualSize: `${d.actualWidth}×${d.actualHeight}`,
          diffPercent: Math.round(d.diffRatio * 100),
          ...saveVisualDiffAssets(runId, r.title, d),
        };
        review++;
      } else if (nb) {
        r.status = 'no-baseline';
        r.visualDiff = {
          message: 'Еталон для цієї сторінки ще не існував — щойно створено новий зі скріну сайту. Перевірте його і, якщо все ок, він стане референсом для майбутніх запусків.',
          ...saveNoBaselineAsset(runId, r.title, nb),
        };
        review++;
      } else {
        trueFailed++;
      }
    }

    const status = trueFailed > 0 ? 'failed' : (review > 0 ? 'review' : 'passed');

    storage.finishRun(runId, {
      status,
      output,
      results,
      total: stats.total,
      passed: stats.passed,
      failed: trueFailed,
      review,
      duration: stats.duration,
      videos,
    });
    broadcastDone();
    currentRun = null;
  });

  proc.on('error', (err) => {
    const text = `\n[Runner error]: ${err.message}\n`;
    if (currentRun) { currentRun.outputLines.push(text); broadcast(text); }
  });
}

function startRun(runId, { group, browser, files, project, headed }, triggeredBy) {
  const args = ['playwright', 'test', '--reporter=list', '--timeout=60000'];
  if (files && files.length > 0) args.push(...files);
  if (project) {
    args.push(`--project=${project}`);
  } else {
    if (browser === 'chrome') args.push('--project=desktop-chrome');
    if (browser === 'firefox') args.push('--project=desktop-firefox');
  }
  if (headed) args.push('--headed');
  const env = { ...process.env, FORCE_COLOR: '0', ...(headed ? { PW_SLOW_MO: '800' } : { CI: '1' }) };
  _launch(runId, args, env, group, browser, triggeredBy);
}

function startPlanRun(runId, { planName, autotests, headed }, triggeredBy) {
  const byFile = {};
  for (const at of autotests) {
    if (!at.specFile || !at.testName) continue;
    if (!byFile[at.specFile]) byFile[at.specFile] = [];
    byFile[at.specFile].push(at.testName);
  }
  const files = Object.keys(byFile).map(f => `tests/${f}`);
  if (!files.length) return;

  const allNames = Object.values(byFile).flat();
  const grepPattern = allNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

  const videoDir = path.join(PLAN_VIDEOS_DIR, runId);
  try { fs.rmSync(videoDir, { recursive: true, force: true }); } catch {}
  fs.mkdirSync(videoDir, { recursive: true });

  const args = ['playwright', 'test', ...files, '--grep', grepPattern,
    '--reporter=list', '--timeout=60000', '--project=desktop-chrome', `--output=${videoDir}`];
  if (headed) args.push('--headed');
  const env = { ...process.env, FORCE_COLOR: '0', PW_VIDEO: 'on', ...(headed ? { PW_SLOW_MO: '800' } : { CI: '1' }) };
  _launch(runId, args, env, planName, 'all', triggeredBy, videoDir);
}

function parseStats(output) {
  const match = output.match(/^\s*(?:(\d+) passed)?(?:,\s*)?(?:(\d+) failed)?\s*\(([^)]+)\)\s*$/m);
  if (!match || (!match[1] && !match[2])) return { total: 0, passed: 0, failed: 0, duration: '?' };
  const passed = parseInt(match[1] || '0', 10);
  const failed = parseInt(match[2] || '0', 10);
  return { total: passed + failed, passed, failed, duration: match[3] };
}

function parseTestResults(output) {
  const byKey = new Map();
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

    // Retries print a separate line per attempt; strip the "(retry #N)" marker
    // and keep only the last attempt (the authoritative final outcome) per test.
    const cleanPath = path.replace(/\s*\(retry #\d+\)\s*$/, '').trim();
    if (!cleanPath) continue;

    byKey.set(`${browser}|${cleanPath}`, {
      status: statusChar === '✓' ? 'passed' : 'failed',
      title: cleanPath,
      browser,
      duration,
    });
  }
  return [...byKey.values()];
}

function parseVisualDiffs(output) {
  const diffs = {};
  const headerRe = /\n\s*\d+\)\s*\[([^\]]+)\]\s*›[^\n]*?›\s*([^\n─]+?)\s*─+/g;
  const headers = [];
  let m;
  while ((m = headerRe.exec(output))) {
    headers.push({ index: m.index, name: m[2].trim() });
  }

  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].index;
    const end = i + 1 < headers.length ? headers[i + 1].index : output.length;
    const block = output.slice(start, end);

    const dim = block.match(/Expected an image (\d+)px by (\d+)px, received (\d+)px by (\d+)px\.\s*([\d,]+) pixels \(ratio ([\d.]+)/);
    if (!dim) continue;

    diffs[headers[i].name] = {
      expectedWidth: +dim[1],
      expectedHeight: +dim[2],
      actualWidth: +dim[3],
      actualHeight: +dim[4],
      diffPixels: +dim[5].replace(/,/g, ''),
      diffRatio: +dim[6],
      expectedPath: block.match(/Expected:\s*(.+)/)?.[1]?.trim(),
      actualPath: block.match(/Received:\s*(.+)/)?.[1]?.trim(),
      diffPath: block.match(/Diff:\s*(.+)/)?.[1]?.trim(),
    };
  }
  return diffs;
}

function parseNoBaselineDiffs(output) {
  const diffs = {};
  const headerRe = /\n\s*\d+\)\s*\[([^\]]+)\]\s*›[^\n]*?›\s*([^\n─]+?)\s*─+/g;
  const headers = [];
  let m;
  while ((m = headerRe.exec(output))) {
    headers.push({ index: m.index, name: m[2].trim() });
  }

  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].index;
    const end = i + 1 < headers.length ? headers[i + 1].index : output.length;
    const block = output.slice(start, end);

    if (!/A snapshot doesn't exist/.test(block)) continue;
    diffs[headers[i].name] = {
      actualPath: block.match(/Received:\s*(.+)/)?.[1]?.trim(),
    };
  }
  return diffs;
}

function saveNoBaselineAsset(runId, name, nb) {
  const urls = {};
  if (!nb.actualPath) return urls;
  const destDir = path.join(VISUAL_DIFFS_DIR, runId);
  fs.mkdirSync(destDir, { recursive: true });
  const destFile = `${name}-actual.png`;
  try {
    fs.copyFileSync(path.join(TESTS_DIR, nb.actualPath), path.join(destDir, destFile));
    urls.actual = `/visual-diffs/${runId}/${destFile}`;
  } catch (_) {}
  return urls;
}

function buildVisualMessage(d) {
  const pct = Math.round(d.diffRatio * 100);
  if (d.expectedWidth !== d.actualWidth) {
    return `Ширина сторінки відрізняється від макета: очікувалось ${d.expectedWidth}px, отримано ${d.actualWidth}px. Відрізняється ${pct}% пікселів.`;
  }
  const heightDiff = d.actualHeight - d.expectedHeight;
  if (Math.abs(heightDiff) > 50) {
    const dir = heightDiff > 0 ? 'вищою' : 'нижчою';
    return `Сторінка стала на ${Math.abs(heightDiff)}px ${dir}, ніж у макеті (${d.expectedHeight}px → ${d.actualHeight}px). Відрізняється ${pct}% пікселів.`;
  }
  return `Розмір сторінки збігається з макетом, але відрізняється ${pct}% пікселів — імовірно змінився вміст, кольори або розташування елементів.`;
}

function saveVisualDiffAssets(runId, name, d) {
  const destDir = path.join(VISUAL_DIFFS_DIR, runId);
  fs.mkdirSync(destDir, { recursive: true });
  const urls = {};
  const files = { expected: d.expectedPath, actual: d.actualPath, diff: d.diffPath };
  for (const [key, relPath] of Object.entries(files)) {
    if (!relPath) continue;
    const destFile = `${name}-${key}.png`;
    try {
      fs.copyFileSync(path.join(TESTS_DIR, relPath), path.join(destDir, destFile));
      urls[key] = `/visual-diffs/${runId}/${destFile}`;
    } catch (_) {}
  }
  return urls;
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

function stopRun() {
  if (!currentRun) return false;
  try { currentRun.process.kill('SIGTERM'); } catch (_) {}
  return true;
}

module.exports = { startRun, startPlanRun, addSseClient, removeSseClient, isRunning, getCurrentRunId, stopRun };
