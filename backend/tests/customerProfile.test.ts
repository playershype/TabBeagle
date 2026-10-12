import { test } from 'node:test';
import assert from 'node:assert/strict';
import { customerInput, customerUpdateInput, profileForDatabase } from '../src/lib/validation';

const base = {
  organizationId: '11111111-1111-4111-8111-111111111111',
  requestId: '22222222-2222-4222-8222-222222222222',
  displayName: 'Acme Plumbing',
  billingEmail: 'billing@acme.example',
};

test('a name-and-email customer (the original form) is still accepted', () => {
  assert.doesNotThrow(() => customerInput.parse(base));
});

test('a full profile is accepted and mapped to the database shape', () => {
  const parsed = customerInput.parse({
    ...base, contactName: 'Maria Lopez', phone: '+1 (787) 555-0100', alternateEmail: 'maria@acme.example',
    companyName: 'Acme Plumbing LLC', billingAddress: '1 Main St, San Juan, PR', workAddress: 'Warehouse 4',
    paymentTermsDays: 30, remindersEnabled: false, collectionDay: 15, notes: 'Pays by check.', tags: ['VIP', 'Referral'],
  });
  const db = profileForDatabase(parsed);
  assert.equal(db.contact_name, 'Maria Lopez');
  assert.equal(db.reminders_enabled, false);
  assert.deepEqual(db.tags, ['VIP', 'Referral']);
});

test('missing optional profile fields become null and reminders default to on', () => {
  const db = profileForDatabase(customerInput.parse(base));
  assert.equal(db.phone, null);
  assert.equal(db.payment_terms_days, null);
  assert.equal(db.reminders_enabled, true);
  assert.deepEqual(db.tags, []);
});

test('invalid profile values are rejected', () => {
  assert.throws(() => customerInput.parse({ ...base, phone: 'call me' }));
  assert.throws(() => customerInput.parse({ ...base, paymentTermsDays: 400 }));
  assert.throws(() => customerInput.parse({ ...base, collectionDay: 29 }));
  assert.throws(() => customerInput.parse({ ...base, alternateEmail: 'not-an-email' }));
  assert.throws(() => customerInput.parse({ ...base, tags: Array.from({ length: 11 }, (_, i) => `t${i}`) }));
  assert.throws(() => customerInput.parse({ ...base, notes: 'x'.repeat(2001) }));
});

test('unknown keys are refused, so a client cannot write arbitrary columns', () => {
  assert.throws(() => customerInput.parse({ ...base, status: 'ARCHIVED' }));
  assert.throws(() => customerUpdateInput.parse({ organizationId: base.organizationId, displayName: 'x', billingEmail: null, source: 'X' }));
});
