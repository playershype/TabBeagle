// Static checks for web-v2/index.html. No dependencies: run with `node --test tests/`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

test('document basics: lang, charset, viewport, title, description', () => {
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<meta charset="utf-8">/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? '';
  assert.ok(title.length > 0 && title.length <= 70, `title length ${title.length}`);
  const desc = html.match(/<meta name="description" content="([^"]+)"/)?.[1] ?? '';
  assert.ok(desc.length >= 70 && desc.length <= 170, `description length ${desc.length}`);
});

test('preview is not indexed and has exactly one h1 inside main', () => {
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(html, /<main id="main">[\s\S]*<h1/);
});

test('skip link targets an existing element', () => {
  assert.match(html, /href="#main"/);
  assert.ok(ids.has('main'));
});

test('every in-page anchor resolves to an id', () => {
  const targets = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  assert.ok(targets.length > 10);
  const missing = targets.filter((t) => !ids.has(t));
  assert.deepEqual(missing, [], `missing anchor targets: ${missing.join(', ')}`);
});

test('aria-describedby references point to existing ids', () => {
  const refs = [...html.matchAll(/aria-describedby="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/));
  const missing = refs.filter((r) => !ids.has(r));
  assert.deepEqual(missing, []);
});

test('local assets referenced by the page exist', () => {
  const refs = [...html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length >= 1);
  for (const r of new Set(refs)) assert.ok(existsSync(resolve(root, r)), `missing ${r}`);
});

test('no external network dependencies, trackers or insecure links', () => {
  assert.doesNotMatch(html, /<script[^>]+src=/i, 'no external scripts');
  assert.doesNotMatch(html, /<link[^>]+rel="stylesheet"/i, 'no external stylesheets');
  const withoutEndpoint = html.replace('https://gaileljkciseopfgwsbc.supabase.co/functions/v1/join-early-access', '');
  assert.doesNotMatch(withoutEndpoint, /https?:\/\/(?!tabbeagle\.com)/i, 'no absolute external URLs besides the approved endpoint');
  assert.doesNotMatch(html, /google-analytics|gtag\(|googletagmanager|facebook|hotjar|segment\.|fbq\(/i, 'no trackers');
  assert.doesNotMatch(html, /http:\/\//i, 'no http links');
});

test('no production or invoice-database identifiers and no secrets in the page', () => {
  assert.doesNotMatch(html, /kbidusxzzuwmxsukqvpm/, 'production Supabase project must not be referenced');
  // The leads endpoint now lives in the shared TEST project (approved 2026-10-09; leads table is isolated by RLS).
  assert.doesNotMatch(html, /sb_publishable_|sb_secret_|service_role|eyJhbGci/i, 'no Supabase keys in the page');
});

test('early access endpoint points only at the approved leads function', () => {
  const urls = [...html.matchAll(/https:\/\/[a-z0-9.-]+\.supabase\.co[^'"\s]*/g)].map((m) => m[0]);
  assert.deepEqual(urls, ['https://gaileljkciseopfgwsbc.supabase.co/functions/v1/join-early-access']);
  assert.match(html, /earlyAccessEndpoint:\s*'https:\/\/gaileljkciseopfgwsbc\.supabase\.co\/functions\/v1\/join-early-access'/);
});

test('form sends the honeypot value so the server can reject bots', () => {
  assert.match(html, /website: \(form\.querySelector\('input\[name="website"\]'\)/);
});

test('copy avoids unverified claims and invented figures', () => {
  const forbidden = [
    /SOC ?2 (certified|compliant|approved)/i,
    /\bguarantee[sd]?\b/i,
    /revolutioni[sz]e/i,
    /AI (is )?autonomously collect/i,
    /\$\s?19\b|\$\s?39\b|\$\s?69\b|\$\s?149\b/,
    /testimonial[s]?:/i,
    /\b\d{1,3}(,\d{3})+ (customers|businesses) (use|trust)/i,
    /\bSAFE\b/,
    /customers? (love|trust) us/i,
    /recovered this month/i,
  ];
  for (const re of forbidden) assert.doesNotMatch(text, re, `forbidden pattern ${re}`);
});

test('every status label is one of the allowed states', () => {
  const states = [...html.matchAll(/class="state">([^<]+)</g)].map((m) => m[1]);
  assert.deepEqual(states, ['Available in test', 'In development', 'In development', 'Designed', 'Planned']);
});

test('sample data is explicitly labelled as sample', () => {
  assert.match(html, /Sample data · not a real customer/);
  assert.match(html, /invented sample data/);
});

test('form has required fields, honeypot and consent', () => {
  for (const name of ['name', 'email', 'businessType', 'invoiceVolume', 'consent']) {
    assert.match(html, new RegExp(`name="${name}"[^>]*required|name="${name}"[^>]*required`), `${name} required`);
  }
  assert.match(html, /name="website"[^>]*tabindex="-1"/, 'honeypot present');
  assert.match(html, /novalidate/, 'custom validation drives messages');
});

test('reduced motion and focus styles are defined', () => {
  assert.match(html, /prefers-reduced-motion/);
  assert.match(html, /:focus-visible/);
});

test('sign-in control is honestly inactive', () => {
  assert.match(html, /<button class="btn btn-ghost[^"]*" type="button" disabled/);
  assert.doesNotMatch(html, /href="[^"]*(login|signin|sign-in)[^"]*"/i, 'no invented login URL');
});
