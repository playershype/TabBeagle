import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amountMinor, bucketOf, daysOverdue, isDate, outstandingByCurrency, todayIn } from '../src/lib/aging';
import { callbackCode } from '../src/lib/authCallback';
import { configurationErrors } from '../src/lib/config';
import { invoiceSchema, type Invoice } from '../src/types';
const invoice: Invoice = {id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',organization_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',customer_id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',invoice_number:'TB-1',original_amount_minor:20000,outstanding_amount_minor:5000,currency:'USD',issue_date:'2026-09-01',due_date:'2026-10-01',payment_status:'PARTIALLY_PAID'};
test('amount parsing uses exact cents and rejects bad input',()=>{
  assert.equal(amountMinor('1250.09'),125009); assert.equal(amountMinor('0.29'),29);
  for(const amount of ['abc','-1','0','1.234','1e3','Infinity','1,200','']) assert.throws(()=>amountMinor(amount));
});
test('calendar dates and aging across DST do not drift',()=>{
  assert.equal(isDate('2026-02-31'),false); assert.equal(isDate('2024-02-29'),true);
  assert.equal(daysOverdue('2026-03-08','2026-03-09'),1);
  assert.throws(()=>daysOverdue('not-a-date','2026-10-01'));
  assert.equal(bucketOf(invoice,'2026-10-31'),'1-30'); assert.equal(bucketOf(invoice,'2026-11-01'),'31-60');
});
test('business timezone, remaining balance and currency separation',()=>{
  assert.equal(todayIn('America/Puerto_Rico',new Date('2026-10-01T02:00:00Z')),'2026-09-30');
  assert.deepEqual(outstandingByCurrency([invoice,{...invoice,currency:'EUR',outstanding_amount_minor:7000},{...invoice,payment_status:'PAID'}]),{USD:5000,EUR:7000});
});
test('only the exact PKCE callback route of the current APK can exchange a code',()=>{
  const expected = 'tabbeagle://auth/callback';
  assert.equal(callbackCode('tabbeagle://auth/callback?code=abc', expected),'abc');
  for(const url of ['https://evil.test/auth/callback?code=x','tabbeagle://other/callback?code=x','tabbeagle://auth/wrong?code=x','tabbeaglenavlab://auth/callback?code=x']) assert.equal(callbackCode(url, expected),null);
  for(const url of ['tabbeagle://auth/callback?error=expired','tabbeagle://auth/callback','tabbeagle://auth/callback?code=a&code=b']) assert.throws(()=>callbackCode(url, expected));
});
test('missing configuration and malformed API data are explicit failures',()=>{
  assert.equal(configurationErrors({}).length,3);
  assert.ok(configurationErrors({apiUrl:'http://api.test',supabaseUrl:'https://db.test',anonKey:'sb_secret_private'}).length>0);
  assert.equal(invoiceSchema.safeParse(invoice).success,true);
  assert.equal(invoiceSchema.safeParse({...invoice,original_amount_minor:'20'}).success,false);
  assert.equal(invoiceSchema.safeParse({...invoice,due_date:'2026-02-31'}).success,false);
});
