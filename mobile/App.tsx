import 'react-native-url-polyfill/auto';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Text, View } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from './src/lib/supabase';
import { configErrors } from './src/lib/config';
import { AUTH_CALLBACK_PATH, callbackCode } from './src/lib/authCallback';
import { fetchOrganizations, createOrganization } from './src/lib/api';
import { OrganizationContext } from './src/lib/org';
import type { Organization, RootStackParams } from './src/types';
import { Button, ErrorText, Field, Form, messageOf, ui } from './src/components/UI';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AddInvoiceScreen from './src/screens/AddInvoiceScreen';
import AddCustomerScreen from './src/screens/AddCustomerScreen';
import InvoiceDetailScreen from './src/screens/InvoiceDetailScreen';
import AccountPasswordScreen from './src/screens/AccountPasswordScreen';
import { testPasswordAuthEnabled } from './src/lib/config';
const Stack = createNativeStackNavigator<RootStackParams>();

function OrganizationGate() {
  const [organizations, setOrganizations] = useState<Organization[] | null>(null);
  const [selected, setSelected] = useState<Organization | null>(null);
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const result = await fetchOrganizations(); setOrganizations(result);
      if (result.length === 1) setSelected(result[0]);
    } catch (e) { setError(messageOf(e)); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function create() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      if (!name.trim()) throw new Error('Enter your business name.');
      new Intl.DateTimeFormat('en', { timeZone: timezone });
      setSelected(await createOrganization(name.trim(), timezone));
    } catch (e) { setError(messageOf(e)); }
    finally { setBusy(false); }
  }
  if (selected) return <OrganizationContext.Provider value={selected}>
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerTitleStyle: { color: '#0F1E36' } }}>
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'TabBeagle' }} />
        <Stack.Screen name="AddCustomer" component={AddCustomerScreen} options={{ title: 'New customer' }} />
        <Stack.Screen name="AddInvoice" component={AddInvoiceScreen} options={{ title: 'New invoice' }} />
        <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} options={{ title: 'Invoice details' }} />
        {testPasswordAuthEnabled && <Stack.Screen name="AccountPassword" component={AccountPasswordScreen} options={{ title: 'Account security · TEST' }} />}
      </Stack.Navigator>
    </NavigationContainer>
  </OrganizationContext.Provider>;
  return <Form>
    <Text style={ui.title}>{organizations?.length === 0 ? 'Set up your business' : 'Your businesses'}</Text>
    <ErrorText message={error} />
    {organizations?.length === 0 ? <>
      <Field label="Business name" value={name} onChangeText={setName} editable={!busy} maxLength={120} />
      <Field label="Business timezone" value={timezone} onChangeText={setTimezone} autoCapitalize="none" editable={!busy} />
      <Text style={ui.subtitle}>Used to calculate invoice due dates. Example: America/Puerto_Rico.</Text>
      <Button title="Create business" onPress={create} busy={busy} />
    </> : organizations?.map(org => <Button key={org.id} title={org.name} onPress={() => setSelected(org)} />)}
    {!organizations && <Button title="Load businesses" onPress={load} busy={busy} />}
    <Button title="Sign out" secondary onPress={() => { void getSupabase().auth.signOut({ scope: 'local' }).catch(e => setError(messageOf(e))); }} />
  </Form>;
}

function ConfiguredApp() {
  const [session, setSession] = useState<Session | null>();
  const [error, setError] = useState<string | null>(null);
  const loadSession = useCallback(async () => {
    setError(null);
    try {
      const { data, error } = await getSupabase().auth.getSession();
      if (error) throw error;
      setSession(data.session);
    } catch (e) { setError(messageOf(e)); }
  }, []);
  useEffect(() => {
    const supabase = getSupabase();
    let active = true;
    const consumed = new Set<string>();
    // Registered in app.json at build time; differs for every isolated APK.
    const expectedRedirect = ExpoLinking.createURL(AUTH_CALLBACK_PATH);
    async function consume(url: string | null) {
      if (!url) return;
      let code: string | null;
      try { code = callbackCode(url, expectedRedirect); } catch (e) { if (active) setError(messageOf(e)); return; }
      if (!code || consumed.has(code)) return;
      consumed.add(code);
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw new Error('This sign-in link could not be verified. Request a new link on this device.');
        if (active) setError(null);
      } catch (e) { if (active) setError(messageOf(e)); }
    }
    void loadSession();
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { if (active) setSession(next); });
    const links = Linking.addEventListener('url', ({ url }) => { void consume(url); });
    Linking.getInitialURL().then(consume).catch(e => { if (active) setError(messageOf(e)); });
    if (AppState.currentState === 'active') supabase.auth.startAutoRefresh();
    const lifecycle = AppState.addEventListener('change', state => {
      if (state === 'active') supabase.auth.startAutoRefresh(); else supabase.auth.stopAutoRefresh();
    });
    return () => { active = false; links.remove(); lifecycle.remove(); data.subscription.unsubscribe(); supabase.auth.stopAutoRefresh(); };
  }, [loadSession]);
  return <View style={ui.page}>
    {error && <View style={{ paddingHorizontal: 24 }}><ErrorText message={error} />{session === undefined && <Button title="Retry" onPress={loadSession} />}</View>}
    {session === undefined ? <ActivityIndicator style={{ marginTop: 40 }} /> : session ? <OrganizationGate key={session.user.id} /> : <LoginScreen />}
  </View>;
}
export default function App() {
  return <SafeAreaProvider><SafeAreaView style={ui.page}><StatusBar style="dark" />
    {configErrors.length ? <Form><Text style={ui.title}>Setup needed</Text><Text style={ui.subtitle}>This build has no configured test environment. Ask for a configured build to sign in and save invoices.</Text><ErrorText message={configErrors.join('\n')} /></Form> : <ConfiguredApp />}
  </SafeAreaView></SafeAreaProvider>;
}
