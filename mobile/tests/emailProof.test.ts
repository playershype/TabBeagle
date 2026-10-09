import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEmailProof } from '../src/lib/emailProof';
const root = 'https://gaileljkciseopfgwsbc.supabase.co';
const token = 'a'.repeat(64);
const url = root + '/auth/v1/verify?token=' + token + '&type=magiclink&redirect_to=tabbeagleauthlab%3A%2F%2Fauth%2Fcallback';
test('accepts unconsumed Supabase magic link without opening a browser', () => {
  assert.deepEqual(parseEmailProof(url, root), { kind:'magic-link', tokenHash:token });
  assert.deepEqual(parseEmailProof(' 123456 ', root), { kind:'email-code', token:'123456' });
});
test('rejects other Supabase projects, tracking links, insecure redirects and other actions', () => {
  const bad = [
    'http://gaileljkciseopfgwsbc.supabase.co/auth/v1/verify?token='+token+'&type=magiclink',
    'https://evil.example/auth/v1/verify?token='+token+'&type=magiclink',
    'https://gaileljkciseopfgwsbc.supabase.co.evil.example/auth/v1/verify?token='+token+'&type=magiclink',
    root+'/auth/v1/verify?token='+token+'&type=recovery',
    root+'/auth/v1/verify?token='+token+'&type=magiclink&token='+token,
    root+'/auth/v1/verify?token='+token+'&type=magiclink&type=magiclink',
    root+'/auth/v1/verify?token='+token+'&type=magiclink#injected',
    root+'/auth/v1/verify?token=x&type=magiclink',
    'https://www.google.com/url?q='+encodeURIComponent(url),
    root+'/auth/v1/token?token='+token+'&type=magiclink',
    ''
  ];
  for (const v of bad) assert.throws(() => parseEmailProof(v, root));
});
