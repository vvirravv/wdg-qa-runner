import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';
import { PAGES } from '../../src/pages';
import { abs } from '../../src/helpers';

/**
 * Qase: "Performance — PageSpeed: <Page> (Desktop >= 90, Mobile >= 70, avg of 5 runs)".
 * Uses PageSpeed Insights API v5. Needs PSI_API_KEY in .env (free Google Cloud key); skipped otherwise.
 * PSI_RUNS (default 5) controls how many runs are averaged. Slow: ~2-5 min per page.
 */
const KEY = process.env.PSI_API_KEY;
const RUNS = Number(process.env.PSI_RUNS ?? 5);

async function psiScore(request: import('@playwright/test').APIRequestContext, url: string, strategy: 'desktop' | 'mobile'): Promise<number> {
  const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance&key=${KEY}`;
  const res = await request.get(api, { timeout: 120_000 });
  expect(res.ok(), `PSI API ${res.status()}`).toBeTruthy();
  const json = await res.json();
  return Math.round(json.lighthouseResult.categories.performance.score * 100);
}

test.describe('PageSpeed @perf', () => {
  test.skip(!KEY, 'PSI_API_KEY not set — PageSpeed checks skipped');
  test.describe.configure({ mode: 'serial', timeout: 20 * 60_000 });

  for (const p of PAGES.filter((x) => x.qase.perf)) {
    test(qase(p.qase.perf!, `Performance — PageSpeed: ${p.name} (Desktop >= 90, Mobile >= 70, avg of ${RUNS})`), async ({ request }) => {
      const scores = { desktop: [] as number[], mobile: [] as number[] };
      for (let i = 0; i < RUNS; i++) {
        scores.desktop.push(await psiScore(request, abs(p.path), 'desktop'));
        scores.mobile.push(await psiScore(request, abs(p.path), 'mobile'));
      }
      const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
      test.info().annotations.push({ type: 'psi', description: JSON.stringify(scores) });
      expect.soft(avg(scores.desktop), `desktop runs ${scores.desktop.join(', ')}`).toBeGreaterThanOrEqual(90);
      expect.soft(avg(scores.mobile), `mobile runs ${scores.mobile.join(', ')}`).toBeGreaterThanOrEqual(70);
    });
  }
});
