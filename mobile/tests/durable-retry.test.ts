import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearPending, loadPending, pendingKey, persistRequest, type KeyValueStore } from '../src/lib/retry';

function fakeStorage() {
  const values = new Map<string,string>();
  const storage: KeyValueStore = {
    getItem: async key => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key,value); },
    removeItem: async key => { values.delete(key); },
  };
  return { storage, values };
}
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const O1 = '11111111-1111-4111-8111-111111111111';
const O2 = '22222222-2222-4222-8222-222222222222';

test('a lost response and restarted Android process reuse the same persisted requestId', async () => {
  const { storage }=fakeStorage();
  const key=pendingKey(A,O1,'invoice');
  const draft=JSON.stringify({organizationId:O1,invoiceNumber:'T-03',amountMinor:10010});
  const first=await persistRequest(storage,key,draft,()=> 'request-1');
  assert.equal(first.id,'request-1');
  // Simulate app process loss: no in-memory ref remains.
  const revived=await loadPending(storage,key);
  assert.deepEqual(revived,first);
  const repeated=await persistRequest(storage,key,draft,()=>{throw Error('unexpected new request id');});
  assert.equal(repeated.id,first.id);
  assert.equal(await clearPending(storage,key,repeated),true);
  assert.equal(await loadPending(storage,key),null);
});

test('a changed invoice draft always gets a new idempotency key', async () => {
  const {storage}=fakeStorage(); const key=pendingKey(A,O1,'invoice');
  const first=await persistRequest(storage,key,'invoice=T-03,amount=100',()=>'one');
  const second=await persistRequest(storage,key,'invoice=T-03,amount=101',()=>'two');
  assert.equal(first.id,'one');assert.equal(second.id,'two');
  assert.equal(await clearPending(storage,key,first),false,'stale response must never clear newer request');
  assert.deepEqual(await loadPending(storage,key),second);
});

test('pending drafts never cross different users, organizations or record types', async () => {
  const {storage}=fakeStorage();
  const key=pendingKey(A,O1,'invoice');
  await persistRequest(storage,key,'draft',()=>'invoice-request');
  assert.equal(await loadPending(storage,pendingKey(B,O1,'invoice')),null);
  assert.equal(await loadPending(storage,pendingKey(A,O2,'invoice')),null);
  assert.equal(await loadPending(storage,pendingKey(A,O1,'customer')),null);
});

test('storage errors fail closed before a POST could be attempted', async () => {
  const broken: KeyValueStore = {
    getItem: async () => null,
    setItem: async () => {throw Error('storage unavailable');},
    removeItem: async () => {},
  };
  await assert.rejects(persistRequest(broken,pendingKey(A,O1,'invoice'),'draft',()=>'id'),/storage unavailable/);
});

test('invalid or corrupt local drafts are never replayed', async () => {
  const {storage,values}=fakeStorage();const key=pendingKey(A,O1,'invoice');
  values.set(key,'{bad');
  assert.equal(await loadPending(storage,key),null);
  values.set(key,JSON.stringify({payload:'data',id:400}));
  assert.equal(await loadPending(storage,key),null);
});
