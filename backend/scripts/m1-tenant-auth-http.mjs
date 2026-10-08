#!/usr/bin/env node
/**
 * TabBeagle M1 -- two genuine signed-in sessions against the real TEST API.
 *
 * Does not create accounts or log/store passwords or bearer tokens.
 * Inputs are short-lived bearer tokens supplied only through a secure process
 * environment. DO NOT commit or paste credentials into GitHub issues/chats.
 * No test writes can succeed: the forged invoice uses a guaranteed-not-present
 * synthetic customer UUID, so even a broken tenant gate cannot create a record.
 *
 * Exit 0: all assertions pass.
 * Exit 2: BLOCKED because approved user sessions were not supplied.
 * Exit 1: unexpected response/security failure.
 */
import { randomUUID } from 'node:crypto';

const base = 'https://tabbeagle-api-test-test.up.railway.app';
const tokens = {
  a: process.env.TB_M1_TEST_A_BEARER,
  b: process.env.TB_M1_TEST_B_BEARER,
};
if (!tokens.a || !tokens.b || tokens.a === tokens.b) {
  console.error('BLOCKED: two DISTINCT, authorized, unexpired TEST account bearer tokens are required in secure environment variables. No requests executed.');
  process.exit(2);
}
const result = [];
function check(value, label) {
  result.push({ label, passed: Boolean(value) });
  console.log((value ? 'PASS ' : 'FAIL ') + label);
  if (!value) process.exitCode = 1;
}
async function request(jwt, method, path, body) {
  const endpoint = new URL(path, base);
  if (endpoint.origin !== base) throw new Error('Refusing to send credentials outside the pinned Railway TEST origin');
  const rsp = await fetch(endpoint, {
    method,
    headers: { Authorization: 'Bearer ' + jwt, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  });
  let data = null;
  try { data = await rsp.json(); } catch { /* no response body */ }
  return { status: rsp.status, data };
}
async function main() {
  const [orgA, orgB] = await Promise.all([
    request(tokens.a, 'GET', '/api/organizations'),
    request(tokens.b, 'GET', '/api/organizations'),
  ]);
  check(orgA.status === 200 && Array.isArray(orgA.data) && orgA.data.length === 1,
    'Account A has exactly one authorized organization');
  check(orgB.status === 200 && Array.isArray(orgB.data) && orgB.data.length === 1,
    'Account B has exactly one authorized organization');
  if (process.exitCode === 1) return;
  const a = orgA.data[0].id;
  const b = orgB.data[0].id;
  // Verify that the two real signed-in users belong to the two designated
  // isolated TEST tenants; don't accidentally certify arbitrary accounts.
  check(orgA.data[0].name === 'PlayersHype' &&
    a === '479d925c-7ed4-4479-9ef2-850c0607a048',
    'Account A is the authorized PlayersHype TEST tenant');
  check(orgB.data[0].name === 'JJ SPA' &&
    b === '7da70daf-c1df-49b5-be80-f56fe3909043',
    'Account B is the authorized JJ SPA TEST tenant');
  check(a !== b, 'Accounts belong to different organizations');
  if (process.exitCode === 1) return;
  const [ownInvoices, forbiddenList, bInvoices, ownCustomers, forbiddenCustomers, forbiddenReverse] = await Promise.all([
    request(tokens.a, 'GET', '/api/invoices?organizationId=' + encodeURIComponent(a)),
    request(tokens.b, 'GET', '/api/invoices?organizationId=' + encodeURIComponent(a)),
    request(tokens.b, 'GET', '/api/invoices?organizationId=' + encodeURIComponent(b)),
    request(tokens.a, 'GET', '/api/customers?organizationId=' + encodeURIComponent(a)),
    request(tokens.b, 'GET', '/api/customers?organizationId=' + encodeURIComponent(a)),
    request(tokens.a, 'GET', '/api/invoices?organizationId=' + encodeURIComponent(b)),
  ]);
  check(ownInvoices.status === 200 && Array.isArray(ownInvoices.data) && ownInvoices.data.length > 0,
    'Account A can read its own invoices');
  check(forbiddenList.status === 200 && Array.isArray(forbiddenList.data) && forbiddenList.data.length === 0,
    'Account B reading account A invoice list receives an empty array');
  check(bInvoices.status === 200 && Array.isArray(bInvoices.data),
    'Account B can read its own invoice list');
  check(forbiddenReverse.status === 200 && Array.isArray(forbiddenReverse.data) && forbiddenReverse.data.length === 0,
    'Account A reading account B invoice list receives an empty array');
  check(ownCustomers.status === 200 && Array.isArray(ownCustomers.data) && ownCustomers.data.length > 0,
    'Account A can read its own customers');
  check(forbiddenCustomers.status === 200 && Array.isArray(forbiddenCustomers.data) && forbiddenCustomers.data.length === 0,
    'Account B reading account A customer list receives an empty array');
  if (process.exitCode === 1) return;
  const invoice = ownInvoices.data[0];
  const [ownDetail, forbiddenDetail] = await Promise.all([
    request(tokens.a, 'GET', '/api/invoices/' + invoice.id),
    request(tokens.b, 'GET', '/api/invoices/' + invoice.id),
  ]);
  check(ownDetail.status === 200 && ownDetail.data?.id === invoice.id,
    'Account A can read authorized invoice detail');
  check(ownDetail.data?.customer && typeof ownDetail.data.customer.display_name === 'string',
    'Authorized invoice embeds its customer relationship');
  check(ownDetail.data?.ar_case && Boolean(ownDetail.data.ar_case.id),
    'Authorized invoice embeds its AR case relationship');
  check(forbiddenDetail.status === 404, 'Account B cannot read an account A invoice by direct ID');
  // This request is deliberately guaranteed not to insert, even if the
  // organization permission check is broken: synthetic customer is absent.
  const forged = await request(tokens.b, 'POST', '/api/invoices', {
    organizationId: a,
    customerId: '00000000-0000-4000-8000-000000000000',
    requestId: randomUUID(),
    invoiceNumber: 'M1-FORBIDDEN-SAFETY-PROBE',
    amountMinor: 1,
    currency: 'USD',
    issueDate: '2026-10-08',
    dueDate: '2026-10-30',
  });
  check(forged.status === 403, 'Account B cross-tenant create denied 403 before customer validation');
  console.log('M1 live TEST HTTP security checks completed; secrets not logged.');
}
main().catch(error => {
  // Network and runtime failures are safe to log, but never include responses,
  // tokens, request headers or environment variable values.
  console.error('FAILED: TEST HTTPS security probe interrupted (' + (error?.name || 'request error') + ')');
  process.exitCode = 1;
});
