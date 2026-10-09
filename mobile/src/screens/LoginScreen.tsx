import React, { useRef, useState } from 'react';
import { Image, Text } from 'react-native';
import { getSupabase } from '../lib/supabase';
import * as ExpoLinking from 'expo-linking';
import { testPasswordAuthEnabled } from '../lib/config';
import { Button, ErrorText, Field, Form, messageOf, ui } from '../components/UI';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [method, setMethod] = useState<'password' | 'link'>(testPasswordAuthEnabled ? 'password' : 'link');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const running = useRef(false);
  async function signIn() {
    if (running.current) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email.'); return; }
    if (method === 'link' && rateLimited) return;
    if (method === 'password' && !password) { setError('Enter the password you created for this TEST account.'); return; }
    running.current = true; setBusy(true); setError(null);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (method === 'password') {
        if (!testPasswordAuthEnabled) throw new Error('Password access is only available in TEST.');
        const { error } = await getSupabase().auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
        setPassword('');
      } else {
        // Magic links are only for existing users: never create a new signup through this UI.
        const { error } = await getSupabase().auth.signInWithOtp({
          email: normalizedEmail,
          options: { emailRedirectTo: ExpoLinking.createURL('auth/callback'), shouldCreateUser: false },
        });
        if (error) throw error;
        setSent(true);
      }
    } catch (e) {
      const message = messageOf(e);
      if (method === 'link' && /rate limit|too many requests|429/i.test(message)) {
        setRateLimited(true);
        setError('Email sending is temporarily limited. Wait before trying again. Your saved invoices are safe.');
      } else if (method === 'password' && /invalid login credentials|invalid credentials/i.test(message)) {
        setError('The email or password is incorrect, or this TEST account has not created a password yet.');
      } else {
        setError(message);
      }
    } finally { running.current = false; setBusy(false); }
  }
  return <Form>
    <Image source={require('../../assets/brand.png')} accessibilityLabel="TabBeagle" style={{ width: 128, height: 128, alignSelf: 'center', marginTop: 36, marginBottom: 24, borderRadius: 24 }} />
    <Text style={ui.title}>Welcome to TabBeagle</Text>
    <Text style={ui.subtitle}>Get paid without chasing customers.</Text>
    {testPasswordAuthEnabled && <Text style={ui.subtitle}>Private TEST access for existing accounts. No public registration.</Text>}
    <Field label="Work email" value={email} onChangeText={value => { setEmail(value); setSent(false); setError(null); setRateLimited(false); }} autoCapitalize="none" keyboardType="email-address" autoComplete="email" editable={!busy} />
    {method === 'password' && testPasswordAuthEnabled && <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCorrect={false} autoCapitalize="none" autoComplete="current-password" editable={!busy} />}
    {method === 'link' && sent && <Text style={[ui.subtitle, { marginTop: 20 }]}>Check your inbox. Open the newest sign-in link on this device. If Gmail shows an empty browser, use its menu to open the link in Chrome.</Text>}
    <ErrorText message={error} />
    <Button title={method === 'password' ? 'Sign in with password' : sent ? 'Send a new link' : 'Send sign-in link'} onPress={signIn} busy={busy} disabled={method === 'link' && rateLimited} />
    {testPasswordAuthEnabled && <>
      <Button title={method === 'password' ? 'Use email sign-in link instead' : 'Sign in with password instead'} secondary disabled={busy} onPress={() => { setMethod(method === 'password' ? 'link' : 'password'); setError(null); setSent(false); }} />
      <Text style={[ui.subtitle, { marginTop: 18 }]}>First time using a password? Sign in with your existing email link once, then choose “Account security · Create TEST password” from your Dashboard.</Text>
    </>}
  </Form>;
}
