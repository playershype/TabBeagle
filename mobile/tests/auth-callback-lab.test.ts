import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUTH_REDIRECT, callbackCode } from '../src/lib/authCallback';

test('magic-link redirect points to this isolated Android app, not stable Build5', () => {
  assert.equal(AUTH_REDIRECT, 'tabbeagleauthlab://auth/callback');
  assert.equal(callbackCode(AUTH_REDIRECT+'?code=jjspa-test-code'), 'jjspa-test-code');
});

test('other app schemes or generic websites cannot be consumed as this session', () => {
  assert.equal(callbackCode('tabbeagle://auth/callback?code=other-app'), null);
  assert.equal(callbackCode('tabbeaglenavlab://auth/callback?code=other-lab'), null);
  assert.equal(callbackCode('https://google.com/?code=wrong-domain'), null);
  assert.equal(callbackCode('tabbeagleauthlab://other/callback?code=wrong-host'), null);
  assert.equal(callbackCode('tabbeagleauthlab://auth/other?code=wrong-path'), null);
});

test('callback rejects malformed, repeated, and expired sign-in codes', () => {
  assert.throws(()=>callbackCode(AUTH_REDIRECT+'?error=access_denied'),/expired or was rejected/);
  assert.throws(()=>callbackCode(AUTH_REDIRECT+'?code=one&code=two'),/incomplete/);
  assert.throws(()=>callbackCode(AUTH_REDIRECT),/incomplete/);
});
