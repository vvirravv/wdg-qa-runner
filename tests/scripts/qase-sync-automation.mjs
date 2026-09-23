// Marks cases as "automated" in Qase based on qase/coverage.csv.
// Dry run by default. Usage:
//   node scripts/qase-sync-automation.mjs            -> prints what would change
//   node scripts/qase-sync-automation.mjs --apply    -> PATCHes cases (needs QASE_TESTOPS_API_TOKEN)
import 'dotenv/config';
import fs from 'node:fs';

const token = process.env.QASE_TESTOPS_API_TOKEN;
const project = process.env.QASE_TESTOPS_PROJECT ?? 'WDG';
const apply = process.argv.includes('--apply');
const rows = fs.readFileSync(new URL('../qase/coverage.csv', import.meta.url), 'utf8').trim().split('\n').slice(1)
  .map((l) => l.match(/^(\d+),(\w+),/)).filter(Boolean).map((m) => ({ id: Number(m[1]), status: m[2] }));
// Qase: 0 = not automated, 1 = to be automated, 2 = automated
const value = { automated: 2, partial: 2, manual: 0 };
console.log(`${rows.length} cases, apply=${apply}`);
for (const r of rows) {
  if (!apply) { console.log(`${project}-${r.id}: automation=${value[r.status]} (${r.status})`); continue; }
  if (!token) throw new Error('QASE_TESTOPS_API_TOKEN is empty');
  const res = await fetch(`https://api.qase.io/v1/case/${project}/${r.id}`, {
    method: 'PATCH', headers: { Token: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ automation: value[r.status] }),
  });
  console.log(`${project}-${r.id}: ${res.status}`);
}
