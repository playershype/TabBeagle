import { test } from 'node:test';
import assert from 'node:assert/strict';
import { body, databaseError, HttpError, route, json } from '../src/lib/http';
import { invoiceInput } from '../src/lib/validation';
import { GET as getInvoices, POST as postInvoice } from '../src/app/api/invoices/route';
const valid = { organizationId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', customerId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',requestId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',invoiceNumber:'TB-1',amountMinor:10001,currency:'USD',issueDate:'2026-10-01',dueDate:'2026-10-30' };
test('unauthenticated invoice reads and writes require a verified session', async () => {
  assert.equal((await getInvoices(new Request('https://example.test/api/invoices'))).status,401);
  assert.equal((await postInvoice(new Request('https://example.test/api/invoices',{method:'POST'}))).status,401);
});
test('invalid dates, decimals, wrong currency and forged state rejected', () => {
  assert.equal(invoiceInput.safeParse(valid).success,true);
  for (const patch of [{dueDate:'2026-02-31'},{dueDate:'2026-09-30'},{amountMinor:10.1},{amountMinor:0},{amountMinor:-10},{currency:'JPY'},{payment_status:'PAID'}]) assert.equal(invoiceInput.safeParse({...valid,...patch}).success,false);
});
test('JSON request limits are enforced and errors do not expose database internals', async () => {
  const handler=route(async request => json(await body(request,invoiceInput)));
  const request=(value:string) => new Request('https://example.test',{method:'POST',headers:{'Content-Type':'application/json'},body:value});
  assert.equal((await handler(request(JSON.stringify(valid)))).status,200);
  assert.equal((await handler(request('{'))).status,400);
  assert.equal((await handler(request('x'.repeat(16385)))).status,413);
  assert.throws(()=>databaseError({code:'42501'}),(e:unknown)=>e instanceof HttpError&&e.status===403);
  const failure=await route(async()=>{throw new Error('private database password');})(request('{}'));
  assert.equal(failure.status,503); assert.equal((await failure.text()).includes('password'),false);
});
