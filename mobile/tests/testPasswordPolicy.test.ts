import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testPasswordError } from '../src/lib/testPasswordPolicy';
import { isIsolatedTestProject } from '../src/lib/config';
test('rejects weak or mismatched password enrollment', () => {
  assert.match(testPasswordError('short','short') ?? '', /12 to 128/);
  assert.match(testPasswordError('a'.repeat(129),'a'.repeat(129)) ?? '', /12 to 128/);
  assert.match(testPasswordError('a-valid-test-password','a-different-test-password') ?? '', /do not match/);
  assert.equal(testPasswordError('a-valid-test-password','a-valid-test-password'), null);
});

test('password features only activate for isolated TEST Supabase URL', () => {
  assert.equal(isIsolatedTestProject('https://gaileljkciseopfgwsbc.supabase.co'), true);
  assert.equal(isIsolatedTestProject('https://kbidusxzzuwmxsukqvpm.supabase.co'), false);
  assert.equal(isIsolatedTestProject(undefined), false);
});
