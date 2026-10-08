import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAuthClient } from '../src/lib/authClient';
import { callbackCode } from '../src/lib/authCallback';
test('Supabase client uses S256 PKCE, exchanges a verifier and restores its stored session', async () => {
  const values = new Map<string,string>();
  const storage = { getItem: (key:string) => values.get(key) ?? null, setItem: (key:string,value:string) => {values.set(key,value);}, removeItem:(key:string)=>{values.delete(key);} };
  const requests: { url: string; body: Record<string,unknown> }[]=[];
  const user={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'owner@example.test',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
  const token = 'header.'+Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.signature';
  const fetcher: typeof fetch=async(input,init)=>{
    requests.push({url:String(input),body:JSON.parse(String(init?.body ?? '{}'))});
    const response=String(input).includes('/token') ? {access_token:token,refresh_token:'test-refresh',expires_in:3600,token_type:'bearer',user} : {};
    return new Response(JSON.stringify(response),{status:200,headers:{'Content-Type':'application/json'}});
  };
  const client=createAuthClient('https://project.supabase.co','test-public-key',storage,fetcher);
  const localRedirect = 'tabbeaglenav7auth://auth/callback';
  await client.auth.signInWithOtp({email:user.email,options:{emailRedirectTo:localRedirect,shouldCreateUser:false}});
  assert.equal(requests[0].body.code_challenge_method,'s256');
  assert.equal(requests[0].body.create_user, false, 'TEST email link must not sign up users');
  assert.equal(typeof requests[0].body.code_challenge,'string');
  const result=await client.auth.exchangeCodeForSession('test-auth-code');
  assert.equal(result.error,null); assert.equal(result.data.session?.user.id,user.id);
  const exchange=requests.find(r=>r.url.includes('/token'))!;
  assert.equal(exchange.body.auth_code,'test-auth-code');
  assert.ok(String(exchange.body.code_verifier).length>=43);
  client.auth.stopAutoRefresh();
  const reopened=createAuthClient('https://project.supabase.co','test-public-key',storage,fetcher);
  assert.equal((await reopened.auth.getSession()).data.session?.user.id,user.id);
  await reopened.auth.signOut({scope:'local'}); reopened.auth.stopAutoRefresh();
  assert.equal((await reopened.auth.getSession()).data.session,null);
});

test('magic-link callback only accepts the installed APK scheme, including PKCE code', () => {
  const current = 'tabbeaglenav7auth://auth/callback';
  assert.equal(callbackCode(current+'?code=supabase-test-code',current),'supabase-test-code');
  // Existing preview and Navigation7 Lab are installed on the same Android phone.
  assert.equal(callbackCode('tabbeagle://auth/callback?code=other-app',current),null);
  assert.equal(callbackCode('tabbeaglenavlab://auth/callback?code=other-app',current),null);
  assert.equal(callbackCode('https://google.com/?code=other-app',current),null);
  assert.equal(callbackCode('tabbeaglenav7auth://evil/callback?code=no',current),null);
  assert.throws(()=>callbackCode(current+'?error=access_denied',current),/expired or was rejected/);
  assert.throws(()=>callbackCode(current+'?code=one&code=two',current),/incomplete/);
});
