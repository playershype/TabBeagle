import React, { useState, useRef } from 'react';
import { Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { Button, ErrorText, Form, messageOf, ui } from '../components/UI';
import { getSupabase } from '../lib/supabase';
import { config } from '../lib/config';
import { runTenantProbe, type TenantProbe } from '../lib/tenantProbe';

export default function TenantProbeScreen() {
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [report,setReport]=useState<TenantProbe|null>(null);
  const pending=useRef(false);
  async function run() {
    if(pending.current)return;
    pending.current=true;setBusy(true);setError(null);setReport(null);
    try {
      const supabase=getSupabase();
      const {data,error}=await supabase.auth.getSession();
      if(error||!data.session)throw Error('Your signed-in TEST session is required. Sign in again.');
      // Never persist, copy, display, or send the bearer to any site except TEST Railway API.
      const result=await runTenantProbe({
        apiUrl:config.apiUrl??'', authUrl:config.supabaseUrl??'',
        accessToken:data.session.access_token, requestId:randomUUID()
      });
      setReport(result);
    }catch(e){setError(messageOf(e));}
    finally{setBusy(false);pending.current=false;}
  }
  const passed=report?.assertions.filter(x=>x.passed).length??0;
  return <Form>
    <Text style={ui.title}>M1 Tenant Isolation · TEST</Text>
    <Text style={ui.subtitle}>This lab checks the real Railway HTTPS API using your existing signed-in session. It cannot access another company's invoices or clients. No bearer tokens, passwords, invoice details or customer records are saved in the report.</Text>
    <Text style={ui.subtitle}>One company at a time. Both separate TEST account sessions must pass before M1's two-identity gate can be accepted. The original GitHub two-bearer runner stays blocked until separately provisioned.</Text>
    <Button title={busy?'Checking TEST HTTPS...':'Run isolated HTTPS security check'} busy={busy} disabled={busy} onPress={run}/>
    <ErrorText message={error}/>
    {report && <>
      <View style={ui.card}>
        <Text style={ui.title}>{report.status==='PASS_ONE_SIDE'?'ONE ACCOUNT: PASS':report.status==='FAIL'?'SECURITY CHECK: FAIL':'CHECK BLOCKED'}</Text>
        <Text style={ui.subtitle}>Authorized tenant: {report.tenant==='jj'?'JJ SPA':report.tenant==='ph'?'PlayersHype TEST':'unknown'} · {passed}/{report.assertions.length} checks · {report.timestamp}</Text>
      </View>
      {report.assertions.map((x,index)=><View key={index} style={ui.card}>
        <Text style={ui.label}>{x.passed?'PASS':'FAIL'} — {x.name}</Text>
        <Text style={ui.subtitle}>Expected: {x.expected}</Text>
        <Text style={ui.subtitle}>Observed: {x.received}</Text>
      </View>)}
      <Text style={ui.subtitle}>This is an on-device diagnostic, not an automatic M1 certification. Preserve a screenshot and never send passwords or JWTs.</Text>
    </>}
  </Form>;
}
