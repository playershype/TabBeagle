import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stableRequest, transportMessage } from '../src/lib/retry';

test('a lost response and identical resend keep exactly one request ID', async () => {
  let counter = 0;
  let pending: ReturnType<typeof stableRequest> | undefined;
  const calls: string[] = [];
  const payload = JSON.stringify({organizationId:'org',invoiceNumber:'T-03',amountMinor:12345});
  async function save(loseReply: boolean) {
    pending = stableRequest(pending, payload, () => 'request-' + ++counter);
    calls.push(pending.id);
    if (loseReply) throw new TypeError('Network request failed');
    return { id: 'invoice-1' };
  }
  await assert.rejects(save(true), /Network request failed/);
  assert.match(transportMessage(new TypeError('Network request failed'))?.message ?? '', /same request ID/);
  const reply = await save(false);
  assert.equal(reply.id,'invoice-1');
  assert.deepEqual(calls,['request-1','request-1']);
  assert.equal(counter,1);
});

test('editing a draft requires a new idempotency request ID', () => {
  let current = stableRequest(undefined,'amount=100',()=>'one');
  current = stableRequest(current,'amount=100',()=>{throw new Error('unexpected key generation')});
  assert.equal(current.id,'one');
  current = stableRequest(current,'amount=200',()=>'two');
  assert.equal(current.id,'two');
});

test('timeout and offline errors provide safe retry guidance', () => {
  const error = new Error('The operation was aborted');error.name='AbortError';
  assert.match(transportMessage(error)?.message??'', /same request ID/);
  assert.match(transportMessage(new TypeError('Failed to fetch'))?.message??'', /Network unavailable/);
  assert.equal(transportMessage(new Error('Authorization denied')),null);
});
