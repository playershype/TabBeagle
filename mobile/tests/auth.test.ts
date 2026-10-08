import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAuthClient } from '../src/lib/authClient';
import { AUTH_REDIRECT, redirectForScheme, callbackCode } from '../src/lib/authCallback';
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
  await client.auth.signInWithOtp({email:user.email,options:{emailRedirectTo:AUTH_REDIRECT,shouldCreateUser:false}});
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

test('magic-link callback requires the exact Android build scheme and refuses stale/foreign links', () => {
  const lab = redirectForScheme('tabbeagleauthlab');
  assert.equal(lab, 'tabbeagleauthlab://auth/callback');
  assert.equal(callbackCode('tabbeagleauthlab://auth/callback?code=one-time-auth-code', lab), 'one-time-auth-code');
  assert.equal(callbackCode('tabbeagle://auth/callback?code=wrong-app-code', lab), null);
  assert.equal(callbackCode('https://google.com/?code=not-an-app-callback', lab), null);
  assert.throws(() => callbackCode('tabbeagleauthlab://auth/callback?error=access_denied', lab), /expired or was rejected/);
  assert.throws(() => callbackCode('tabbeagleauthlab://auth/callback#error_description=expired', lab), /expired or was rejected/);
  assert.throws(() => callbackCode('tabbeagleauthlab://auth/callback', lab), /incomplete/);
  assert.throws(() => redirectForScheme('https://invalid'), /Invalid application/);
});

test('email code fallback verifies the same existing user and stores the received session without link navigation', async () => {
  const memory = new Map<string,string>();
  const storage = {getItem:(k:string)=>memory.get(k) ?? null,setItem:(k:string,v:string)=>{memory.set(k,v)},removeItem:(k:string)=>{memory.delete(k)}};
  const user={id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',aud:'authenticated',role:'authenticated',email:'jj-spa@example.test',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
  const jwt='header.'+Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.signature';
  const requests: {url:string,body:Record<string,unknown>}[]=[];
  const stub:typeof fetch=async(input,init)=>{
    const url=String(input);
    const body=JSON.parse(String(init?.body||'{}'));
    requests.push({url,body});
    return new Response(JSON.stringify({access_token:jwt,refresh_token:'refresh-token',expires_in:3600,token_type:'bearer',user}),
      {status:200,headers:{'Content-Type':'application/json'}});
  };
  const client=createAuthClient('https://project.supabase.co','test-public-key',storage,stub);
  const result=await client.auth.verifyOtp({email:user.email,token:'123456',type:'email'});
  assert.equal(result.error,null);
  assert.equal(result.data.session?.user.id,user.id);
  assert.equal(requests.length,1);
  assert.ok(requests[0].url.includes('/verify'));
  assert.equal(requests[0].body.token,'123456');
  assert.equal(requests[0].body.type,'email');
  client.auth.stopAutoRefresh();
});
