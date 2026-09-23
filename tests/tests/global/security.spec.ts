import tls from 'node:tls';
import http from 'node:http';
import { qase } from 'playwright-qase-reporter';
import { test, expect } from '../../src/fixtures';

const HOST = new URL(process.env.BASE_URL ?? 'https://devit.group').hostname;

function peerCert(host: string): Promise<tls.PeerCertificate & { authorized: boolean; authError?: string }> {
  return new Promise((resolve, reject) => {
    const s = tls.connect({ host, port: 443, servername: host, rejectUnauthorized: false }, () => {
      const cert = s.getPeerCertificate();
      resolve(Object.assign(cert, { authorized: s.authorized, authError: s.authorizationError?.toString() }));
      s.end();
    });
    s.on('error', reject);
  });
}

function plainHttp(path: string): Promise<{ status: number; location?: string }> {
  return new Promise((resolve, reject) => {
    http.get({ host: HOST, path, timeout: 15_000 }, (res) => {
      resolve({ status: res.statusCode ?? 0, location: res.headers.location });
      res.resume();
    }).on('error', reject);
  });
}

test.describe('Security', () => {
  test(qase(25186, 'Security — SSL certificate is valid'), async () => {
    const cert = await peerCert(HOST);
    expect(cert.authorized, `TLS not trusted: ${cert.authError}`).toBe(true);
    const daysLeft = (new Date(cert.valid_to).getTime() - Date.now()) / 86_400_000;
    expect(daysLeft, `certificate expires ${cert.valid_to}`).toBeGreaterThan(14);
    expect(String(cert.subjectaltname)).toContain(HOST);
  });

  test(qase(25187, 'Security — HTTP redirects to HTTPS for all key paths + HSTS'), async ({ request }) => {
    for (const path of ['/', '/work', '/contact', '/shopify', '/case-studies']) {
      await test.step(`http://${HOST}${path}`, async () => {
        const r = await plainHttp(path);
        expect.soft([301, 302, 307, 308], `${path} status ${r.status}`).toContain(r.status);
        expect.soft(r.location ?? '', `${path} Location`).toMatch(new RegExp(`^https://${HOST.replace('.', '\\.')}`));
      });
    }
    const res = await request.get('/');
    const hsts = res.headers()['strict-transport-security'] ?? '';
    expect(hsts, 'Strict-Transport-Security header').toMatch(/max-age=\d+/);
    expect(Number(hsts.match(/max-age=(\d+)/)?.[1] ?? 0)).toBeGreaterThanOrEqual(31_536_000);
  });

  test(qase(25188, 'Security — security response headers present with correct values'), async ({ request }) => {
    const res = await request.get('/');
    expect(res.status()).toBe(200);
    const h = res.headers();
    expect.soft(h['strict-transport-security'] ?? '', 'HSTS').toMatch(/max-age=(3153600\d|[4-9]\d{7,}|\d{9,})/);
    expect.soft(h['x-content-type-options'], 'X-Content-Type-Options').toBe('nosniff');
    expect.soft(h['x-frame-options'] ?? '', 'X-Frame-Options').toMatch(/DENY|SAMEORIGIN/i);
    expect.soft(h['content-security-policy'] ?? '', 'Content-Security-Policy').not.toBe('');
    expect.soft(h['content-security-policy'] ?? '', 'CSP with unsafe-eval').not.toMatch(/unsafe-eval/);
    expect.soft(h['referrer-policy'] ?? '', 'Referrer-Policy').toMatch(/strict-origin-when-cross-origin|same-origin|no-referrer|strict-origin/);
  });

  test(qase(25189, 'Security — XSS: script in form field does not execute (partial: client side)'), async ({ page, modals }) => {
    // Partial automation: checks that the payload is NOT executed while typing/validating.
    // The server-side part (submit + check lead in Pipedrive sandbox) stays manual — creates a lead on prod.
    let dialog = false;
    page.on('dialog', async (d) => { dialog = true; await d.dismiss(); });
    await page.goto('/');
    await page.getByRole('button', { name: 'open lets talk modal button' }).first().click();
    await modals.field(/Full Name/).fill(`Yan <script>alert('asd');</script><img src=x onerror=alert(1)>`);
    await modals.field(/Email/).fill('not-an-email'); // keeps the form from submitting
    await modals.submit.click();
    await expect(modals.emailError).toBeVisible();
    expect(dialog, 'alert() executed').toBe(false);
  });
});
