// Handler tests for join-early-access with a stubbed database.
// Run: node --experimental-strip-types --test tests/handler.test.mjs
// The function's npm import is swapped for a stub; nothing here touches Supabase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(here, '../functions/join-early-access/index.ts'), 'utf8')
  .replace('import { createClient } from "npm:@supabase/supabase-js@2.45.4";', 'import { createClient } from "./stub.mjs";');
const dir = mkdtempSync(join(tmpdir(), 'leads-'));
writeFileSync(join(dir, 'stub.mjs'), `export const calls = []; let next = { error: null };
export const setNext = (v) => { next = v; };
export const createClient = () => ({ from: () => ({ insert: async (row) => { calls.push(row); return next; } }) });`);
writeFileSync(join(dir, 'fn.ts'), src);

globalThis.Deno = { env: { get: (k) => ({ SUPABASE_URL: 'http://x', SUPABASE_SERVICE_ROLE_KEY: 'srv' })[k] }, serve(h) { globalThis.__h = h; } };
await import(pathToFileURL(join(dir, 'fn.ts')).href);
const stub = await import(pathToFileURL(join(dir, 'stub.mjs')).href);
const handler = globalThis.__h;

const O = 'https://tabbeagle.com';
const good = { name: 'QA Test', email: 'QA.Test@Example.com', business_type: 'Agency', invoice_volume: '21–50', pain_point: '', consent_marketing: true, source: 'landing-preview', website: '' };
const req = (body, origin = O, method = 'POST') => new Request('http://f/', {
  method,
  headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) },
  body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
});

const cases = [
  ['valid -> 201', req(good), 201, { error: null }],
  ['duplicate -> 409', req({ ...good, email: 'dup@example.com' }), 409, { error: { code: '23505' } }],
  ['other DB error -> 500', req({ ...good, email: 'err@example.com' }), 500, { error: { code: 'XX' } }],
  ['wrong origin -> 403', req(good, 'https://evil.example'), 403],
  ['no origin -> 403', req(good, null), 403],
  ['GET -> 405', req(null, O, 'GET'), 405],
  ['bad JSON -> 400', req('{nope'), 400],
  ['honeypot filled -> 400', req({ ...good, website: 'spam' }), 400],
  ['no consent -> 400', req({ ...good, consent_marketing: false }), 400],
  ['bad email -> 400', req({ ...good, email: 'x@y' }), 400],
  ['unknown business type -> 400', req({ ...good, business_type: 'Bank' }), 400],
  ['pain > 300 chars -> 400', req({ ...good, pain_point: 'a'.repeat(301) }), 400],
  ['body > 4KB -> 413', req({ ...good, pain_point: 'a'.repeat(5000) }), 413],
  ['preflight OPTIONS -> 204', req(null, O, 'OPTIONS'), 204],
];

for (const [name, request, want, dbNext] of cases) {
  test(name, async () => {
    stub.setNext(dbNext ?? { error: null });
    const res = await handler(request);
    assert.equal(res.status, want);
  });
}

test('valid submission is stored normalized, with consent time and null pain point', async () => {
  stub.setNext({ error: null });
  const before = stub.calls.length;
  await handler(req({ ...good, email: 'Row.Check@Example.com' }));
  const row = stub.calls.slice(before)[0];
  assert.equal(row.email_normalized, 'row.check@example.com');
  assert.equal(row.name, 'QA Test');
  assert.equal(row.pain_point, null);
  assert.equal(row.source, 'landing-preview');
  assert.match(row.consent_at, /^\d{4}-\d{2}-\d{2}T/);
});

test('CORS echoes only allowed origins', async () => {
  stub.setNext({ error: null });
  const res = await handler(req({ ...good, email: 'cors@example.com' }));
  assert.equal(res.headers.get('access-control-allow-origin'), O);
});
