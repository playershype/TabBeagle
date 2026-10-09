import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runTenantProbe,validateProbeOrigin,EXPECTED_TEST_API,EXPECTED_TEST_AUTH} from '../src/lib/tenantProbe';
const A='479d925c-7ed4-4479-9ef2-850c0607a048';
const B='7da70daf-c1df-49b5-be80-f56fe3909043';
const invoice='f37a8d95-f361-4238-90d9-ae03de6bec11';
const uuid='aafef045-2211-4333-8b44-ecfacba98d3e';
function fetchMock(who:'jj'|'ph',deny=true) {
  const seen:{url:string;method:string;auth:string|undefined}[]=[];
  const f=async (input:RequestInfo|URL,init?:RequestInit) => {
    const url=new URL(String(input)),method=init?.method??'GET';
    seen.push({url:url.toString(),method,auth:new Headers(init?.headers).get('Authorization')??undefined});
    const mine=who==='jj'?B:A,other=who==='jj'?A:B;
    let status=200,body:unknown=null;
    if(url.pathname==='/api/organizations') body=[{id:mine,name:who==='jj'?'JJ SPA':'PlayersHype'}];
    else if(url.pathname==='/api/invoices'&&method==='GET') body=url.searchParams.get('organizationId')===mine?(who==='jj'?[]:Array(5).fill({id:invoice})):deny?[]:[{id:invoice}];
    else if(url.pathname==='/api/customers'&&method==='GET') body=url.searchParams.get('organizationId')===other?[]:[{id:uuid}];
    else if(url.pathname==='/api/invoices/'+invoice) {status=who==='jj'?404:200;body=who==='jj'?{error:'not found'}:{id:invoice};}
    else if(url.pathname==='/api/invoices'&&method==='POST') {status=403;body={error:'denied'};}
    else throw Error('Unexpected path '+url.pathname);
    return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
  };
  return {f:f as typeof fetch,seen};
}
test('only pinned TEST origins accepted',()=>{
 assert.doesNotThrow(()=>validateProbeOrigin(EXPECTED_TEST_API,EXPECTED_TEST_AUTH));
 assert.throws(()=>validateProbeOrigin('https://example.com',EXPECTED_TEST_AUTH),/non-TEST/);
 assert.throws(()=>validateProbeOrigin(EXPECTED_TEST_API,'https://kbidusxzzuwmxsukqvpm.supabase.co'),/non-TEST/);
});
for(const who of ['jj','ph'] as const){
 test(who+' real HTTPS request contract: identity, own data, foreign read/write, no credential leakage in report',async()=>{
  const {f,seen}=fetchMock(who);
  const out=await runTenantProbe({apiUrl:EXPECTED_TEST_API,authUrl:EXPECTED_TEST_AUTH,accessToken:'test-token-opaque-only-for-mock',requestId:uuid,fetcher:f});
  assert.equal(out.tenant,who);assert.equal(out.status,'PASS_ONE_SIDE');assert.ok(out.assertions.every(x=>x.passed));
  assert.ok(seen.every(x=>x.auth==='Bearer test-token-opaque-only-for-mock'));
  assert.ok(seen.every(x=>x.url.startsWith(EXPECTED_TEST_API+'/api/')));
  assert.ok(seen.some(x=>x.method==='POST'));
  assert.ok(!JSON.stringify(out).includes('test-token'));
 });
}
test('visible foreign invoices fail even when HTTP 200',async()=>{
 const {f}=fetchMock('jj',false);
 const res=await runTenantProbe({apiUrl:EXPECTED_TEST_API,authUrl:EXPECTED_TEST_AUTH,accessToken:'test-token-opaque-only-for-mock',requestId:uuid,fetcher:f});
 assert.equal(res.status,'FAIL');
 assert.equal(res.assertions.find(x=>x.name==='Foreign invoices hidden')?.passed,false);
});
