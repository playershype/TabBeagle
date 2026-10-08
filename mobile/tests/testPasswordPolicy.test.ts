import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testPasswordError } from '../src/lib/testPasswordPolicy';
test('rejects weak or mismatched password enrollment', () => {
  assert.match(testPasswordError('short','short') ?? '', /12 to 128/);
  assert.match(testPasswordError('a'.repeat(129),'a'.repeat(129)) ?? '', /12 to 128/);
  assert.match(testPasswordError('a-valid-test-password','a-different-test-password') ?? '', /do not match/);
  assert.equal(testPasswordError('a-valid-test-password','a-valid-test-password'), null);
});
