import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draftFromCustomer, draftFromPayload, emptyDraft, termsLabel, toPayload } from '../src/lib/customerForm';
import { customerSchema, type Customer } from '../src/types';

test('a name-only customer keeps the 30-day default and sends empty fields as null', () => {
  const payload = toPayload({ ...emptyDraft(), displayName: '  Acme  ' });
  assert.equal(payload.displayName, 'Acme');
  assert.equal(payload.phone, null);
  assert.equal(payload.billingEmail, null);
  assert.equal(payload.paymentTermsDays, 30);
  assert.equal(payload.remindersEnabled, true);
  assert.deepEqual(payload.tags, []);
});

test('a full profile is validated and normalized', () => {
  const payload = toPayload({
    ...emptyDraft(), displayName: 'Acme', billingEmail: 'Billing@Acme.example', phone: '+1 (787) 555-0100',
    contactName: ' Maria ', collectionDay: '15', tags: ' VIP , referral,, ', notes: 'Pays by check.',
  });
  assert.equal(payload.billingEmail, 'billing@acme.example');
  assert.equal(payload.contactName, 'Maria');
  assert.equal(payload.collectionDay, 15);
  assert.deepEqual(payload.tags, ['VIP', 'referral']);
});

test('bad values fail with a readable message before any request is sent', () => {
  const base = { ...emptyDraft(), displayName: 'Acme' };
  assert.throws(() => toPayload({ ...base, displayName: '   ' }), /customer name/);
  assert.throws(() => toPayload({ ...base, billingEmail: 'nope' }), /billing email/);
  assert.throws(() => toPayload({ ...base, phone: 'call me' }), /phone/);
  assert.throws(() => toPayload({ ...base, paymentTermsDays: '400' }), /Payment terms/);
  assert.throws(() => toPayload({ ...base, paymentTermsDays: '12.5' }), /Payment terms/);
  assert.throws(() => toPayload({ ...base, collectionDay: '29' }), /Collection day/);
  assert.throws(() => toPayload({ ...base, tags: 'a,b,c,d,e,f,g,h,i,j,k' }), /up to 10/);
  assert.throws(() => toPayload({ ...base, notes: 'x'.repeat(2001) }), /2000/);
});

const saved: Customer = customerSchema.parse({
  id: '11111111-1111-4111-8111-111111111111', organization_id: '22222222-2222-4222-8222-222222222222',
  display_name: 'Acme', billing_email: 'billing@acme.example', status: 'ACTIVE', contact_name: 'Maria', phone: null,
  payment_terms_days: 15, reminders_enabled: false, collection_day: null, notes: 'Hi', tags: ['VIP'],
});

test('editing a saved customer starts from its stored values', () => {
  const draft = draftFromCustomer(saved);
  assert.equal(draft.contactName, 'Maria');
  assert.equal(draft.paymentTermsDays, '15');
  assert.equal(draft.remindersEnabled, false);
  assert.equal(draft.tags, 'VIP');
});

test('a draft from an older app version still restores without crashing', () => {
  const draft = draftFromPayload({ displayName: 'Old', billingEmail: null });
  assert.equal(draft.displayName, 'Old');
  assert.equal(draft.paymentTermsDays, '30');
  assert.equal(draft.remindersEnabled, true);
});

test('terms are shown in plain words', () => {
  assert.equal(termsLabel(30), 'Net 30');
  assert.equal(termsLabel(0), 'Due on receipt');
  assert.equal(termsLabel(null), 'Not set');
});
