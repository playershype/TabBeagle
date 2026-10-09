/**
 * M1 real-network tenant isolation probe, restricted to the two TEST tenants.
 * Executes under the on-device user's real JWT. NEVER stores/prints/transmits
 * credentials anywhere other than the pinned TEST API's Authorization header.
 *
 * Source audit/PG RLS unit tests are not a replacement for this HTTPS probe.
 */
export const EXPECTED_TEST_API = 'https://tabbeagle-api-test-test.up.railway.app';
export const EXPECTED_TEST_AUTH = 'https://gaileljkciseopfgwsbc.supabase.co';
const TENANTS = {
  jj: {id:'7da70daf-c1df-49b5-be80-f56fe3909043', name:'JJ SPA', invoices:0},
  ph: {id:'479d925c-7ed4-4479-9ef2-850c0607a048', name:'PlayersHype', invoices:5},
} as const;
// Existing TEST invoice from the other organization; metadata is not a credential.
const PLAYERSHYPE_TEST_INVOICE = 'f37a8d95-f361-4238-90d9-ae03de6bec11';
type Tenant = keyof typeof TENANTS;
export type GateAssertion = {name:string; expected:string; received:string; passed:boolean};
export type TenantProbe = {tenant:Tenant|null; assertions:GateAssertion[]; status:'PASS_ONE_SIDE'|'FAIL'|'BLOCKED'; timestamp:string};
type Fetcher = typeof fetch;

export function validateProbeOrigin(apiUrl: string, authUrl: string) {
  if (apiUrl !== EXPECTED_TEST_API || authUrl !== EXPECTED_TEST_AUTH) {
    throw new Error('Security probe refuses non-TEST endpoints.');
  }
}
export async function runTenantProbe(input: {
  apiUrl:string; authUrl:string; accessToken:string; requestId:string; fetcher?:Fetcher;
}): Promise<TenantProbe> {
  validateProbeOrigin(input.apiUrl,input.authUrl);
  if (!input.accessToken || input.accessToken.length < 24 || /\s/.test(input.accessToken)) {
    throw new Error('An active authenticated TEST session is required.');
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) {
    throw new Error('A fresh probe request ID is required.');
  }
  const http = input.fetcher??fetch;
  const assertions:GateAssertion[]=[];
  function check(name:string,ok:boolean,expected:string,received:string) {
    assertions.push({name,passed:ok,expected,received});
  }
  async function req(method:'GET'|'POST',path:string,body?:unknown) {
    const u=new URL(path,EXPECTED_TEST_API);
    if(u.origin!==EXPECTED_TEST_API || !u.pathname.startsWith('/api/')) throw new Error('Unsafe probe route');
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),12000);
    try {
      const response=await http(u.toString(),{
        method,
        redirect:'error',
        headers:{
          Authorization:'Bearer '+input.accessToken,
          ...(body===undefined?{}:{'Content-Type':'application/json'})
        },
        body:body===undefined?undefined:JSON.stringify(body),
        signal:controller.signal,
      });
      // Only parse read endpoints; never include PII, response body, URL, or JWT in report.
      const json:unknown=method==='GET'?await response.json().catch(()=>null):null;
      return {status:response.status,data:json};
    }finally{clearTimeout(timeout);}
  }
  // Our signed-in organization is determined by the authorized API, not user input.
  let organizations:{status:number;data:unknown};
  try{organizations=await req('GET','/api/organizations');}
  catch{ return {tenant:null,assertions:[{name:'TEST API reachable',expected:'HTTPS response',received:'network unavailable',passed:false}],status:'BLOCKED',timestamp:new Date().toISOString()};}
  if(organizations.status!==200||!Array.isArray(organizations.data)||
    organizations.data.length!==1) {
    check('Authenticated tenant scope',false,'200 and exactly one authorized organization',
      String(organizations.status)+'; count '+(Array.isArray(organizations.data)?organizations.data.length:'invalid'));
    return {tenant:null,assertions,status:'FAIL',timestamp:new Date().toISOString()};
  }
  const mine=organizations.data[0] as {id?:unknown;name?:unknown};
  const side=(Object.keys(TENANTS) as Tenant[]).find(k=>TENANTS[k].id===mine.id&&TENANTS[k].name===mine.name);
  if(!side){
    check('Known TEST identity',false,'JJ SPA or PlayersHype TEST','unexpected organization');
    return {tenant:null,assertions,status:'FAIL',timestamp:new Date().toISOString()};
  }
  check('Authorized organizations',true,'only '+TENANTS[side].name,'one matching organization');
  const other=side==='jj'?'ph':'jj';
  const own=TENANTS[side],foreign=TENANTS[other];
  const tests:[string,()=>Promise<{status:number;data:unknown}>,(res:{status:number;data:unknown})=>boolean,string][]=[
    ['Own invoice list',()=>req('GET','/api/invoices?organizationId='+own.id),
      res=>res.status===200&&Array.isArray(res.data)&&res.data.length===own.invoices,
      '200; exactly '+own.invoices+' invoices'],
    ['Own customers',()=>req('GET','/api/customers?organizationId='+own.id),
      res=>res.status===200&&Array.isArray(res.data),'200; authorized list'],
    ['Foreign invoices hidden',()=>req('GET','/api/invoices?organizationId='+foreign.id),
      res=>res.status===200&&Array.isArray(res.data)&&res.data.length===0,'200; empty array'],
    ['Foreign customers hidden',()=>req('GET','/api/customers?organizationId='+foreign.id),
      res=>res.status===200&&Array.isArray(res.data)&&res.data.length===0,'200; empty array']
  ];
  if(side==='jj'){
    tests.push(['Foreign invoice ID denied',()=>req('GET','/api/invoices/'+PLAYERSHYPE_TEST_INVOICE),
      res=>res.status===404,'404; no invoice detail']);
  }else{
    tests.push(['Own invoice ID readable',()=>req('GET','/api/invoices/'+PLAYERSHYPE_TEST_INVOICE),
      res=>res.status===200&&typeof res.data==='object'&&res.data!==null&&
        (res.data as {id?:unknown}).id===PLAYERSHYPE_TEST_INVOICE,'200; authorized invoice detail']);
  }
  // The customer UUID below cannot exist by construction; it must be rejected
  // by a correct membership check BEFORE any DB insert could occur.
  tests.push(['Foreign invoice creation rejected',()=>req('POST','/api/invoices',{
    organizationId:foreign.id,
    customerId:'00000000-0000-4000-8000-000000000000',
    requestId:input.requestId,
    invoiceNumber:'M1-SECURITY-PROBE-NO-CREATE',
    amountMinor:1,
    currency:'USD',
    issueDate:'2026-10-09',
    dueDate:'2026-10-30'
  }),res=>res.status===403,'403; no insertion']);
  for (const [name,act,predicate,expected] of tests){
    try {const response=await act();check(name,predicate(response),expected,String(response.status)+(Array.isArray(response.data)?'; count '+response.data.length:''));}
    catch {check(name,false,expected,'network or parsing error');}
  }
  return {tenant:side,assertions,status:assertions.every(x=>x.passed)?'PASS_ONE_SIDE':'FAIL',timestamp:new Date().toISOString()};
}
