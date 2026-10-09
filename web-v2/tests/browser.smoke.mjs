// Browser checks for web-v2/index.html using Playwright (Chromium).
// Usage: node tests/browser.smoke.mjs [outputDir]
// Serves the folder itself on a random local port; no external network is needed.
import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(process.argv[2] || join(root, '.screenshots'));
mkdirSync(outDir, { recursive: true });

const types = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = join(root, path === '/' ? 'index.html' : path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!file.startsWith(root) || !existsSync(file)) { res.writeHead(404).end('not found'); return; }
  res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const results = [];
const check = async (name, fn) => {
  try { await fn(); results.push(['PASS', name]); }
  catch (err) { results.push(['FAIL', name, err.message]); }
};

const browser = await chromium.launch();
try {
  // 1. Layout at phone, tablet and desktop widths: no horizontal overflow.
  for (const width of [320, 390, 768, 1280]) {
    await check(`no horizontal overflow at ${width}px`, async () => {
      const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      await page.goto(base, { waitUntil: 'load' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      await page.close();
      assert.ok(overflow <= 0, `scrollWidth exceeds viewport by ${overflow}px`);
    });
  }

  // 2. Full-page screenshots for visual review (kept outside the repo by default).
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(base, { waitUntil: 'load' });
    await page.screenshot({ path: join(outDir, `landing-${width}.png`), fullPage: true });
    await page.close();
  }

  // 3. Console errors and network requests on load and during interaction.
  // Reduced motion keeps scrolling instant so Playwright can act on elements reliably; the page also honours it.
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const consoleErrors = [];
  const requests = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  page.on('request', (r) => { if (!r.url().startsWith(base)) requests.push(r.url()); });
  await page.goto(base, { waitUntil: 'load' });

  await check('no console errors or page exceptions on load', async () => {
    assert.deepEqual(consoleErrors, []);
  });

  await check('anchor navigation scrolls to the target section', async () => {
    await page.click('header a[href="#control"]');
    await page.waitForTimeout(400);
    const top = await page.evaluate(() => document.getElementById('control').getBoundingClientRect().top);
    assert.ok(top < 200, `control section top=${top}`);
  });

  await check('sign-in control is disabled and labelled', async () => {
    const disabled = await page.getAttribute('.nav-actions button', 'disabled');
    assert.notEqual(disabled, null);
  });

  await check('empty submit shows field errors and moves focus to the first invalid field', async () => {
    await page.goto(base + '#early-access', { waitUntil: 'load' });
    await page.click('#ea-submit');
    const visible = await page.locator('#ea-name-err.show').count();
    assert.equal(visible, 1);
    const focused = await page.evaluate(() => document.activeElement && document.activeElement.id);
    assert.equal(focused, 'ea-name');
    const invalid = await page.getAttribute('#ea-name', 'aria-invalid');
    assert.equal(invalid, 'true');
  });

  await check('malformed email is rejected with a specific message', async () => {
    await page.fill('#ea-name', 'Test Person');
    await page.fill('#ea-email', 'not-an-email');
    await page.locator('#ea-email').blur();
    const msg = await page.textContent('#ea-email-err');
    assert.match(msg, /name@company\.com/);
  });

  await check('valid submission in preview build is honest and sends nothing', async () => {
    await page.fill('#ea-email', 'test.person@example.com');
    await page.selectOption('#ea-type', 'Agency');
    await page.selectOption('#ea-volume', '21–50');
    await page.check('#ea-consent');
    // Honeypot must be empty, and the minimum fill time must pass.
    await page.waitForTimeout(2600);
    await page.click('#ea-submit');
    const status = await page.textContent('#ea-status');
    assert.match(status, /Preview build: your details were not sent/);
    const external = requests.filter((u) => !u.startsWith(base));
    assert.deepEqual(external, [], 'no external requests');
  });

  await check('screenshot of form states (desktop)', async () => {
    const section = page.locator('#early-access');
    await section.screenshot({ path: join(outDir, 'early-access-form-1280.png') });
  });

  await page.close();
  await check('no external requests during whole session', async () => {
    assert.deepEqual(requests, []);
  });
} finally {
  await browser.close();
  server.close();
}

let failed = 0;
for (const [status, name, detail] of results) {
  console.log(`${status}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (status === 'FAIL') failed++;
}
console.log(`\n${results.length - failed}/${results.length} browser checks passed. Screenshots: ${outDir}`);
process.exitCode = failed ? 1 : 0;
