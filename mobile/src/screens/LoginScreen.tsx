import React, { useRef, useState } from 'react';
import { Image, Text } from 'react-native';
import { getSupabase } from '../lib/supabase';
import { AUTH_REDIRECT } from '../lib/authCallback';
import { testPasswordAuthEnabled } from '../lib/config';
import { Button, ErrorText, Field, Form, messageOf, ui } from '../components/UI';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailCode, setEmailCode] = useState('');
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
          options: { emailRedirectTo: AUTH_REDIRECT, shouldCreateUser: false },
        });
        if (error) throw error;
        setEmailCode('');
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
  // Optional TEST fallback when an email client does not hand a deep link to Android.
  // Supabase's Magic Link email template must include {{ .Token }} to show a code.
  async function verifyEmailCode() {
    if (running.current) return;
    if (!/^[0-9]{6,8}$/.test(emailCode.trim())) {
      setError('Enter the numeric code shown in your newest email.');
      return;
    }
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email.trim())) {
      setError('Enter the same work email that received the code.');
      return;
    }
    running.current = true; setBusy(true); setError(null);
    try {
      const { error } = await getSupabase().auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: emailCode.trim(),
        type: 'email',
      });
      if (error) throw error;
      setEmailCode('');
      setSent(false);
    } catch {
      // Codes are one-time and short-lived; never log the token or response.
      setError('The email code could not be verified. Use the newest code for this account.');
    } finally {
      running.current = false; setBusy(false);
    }
  }
  return <Form>
    <Image source={require('../../assets/brand.png')} accessibilityLabel="TabBeagle" style={{ width: 128, height: 128, alignSelf: 'center', marginTop: 36, marginBottom: 24, borderRadius: 24 }} />
    <Text style={ui.title}>Welcome to TabBeagle</Text>
    <Text style={ui.subtitle}>Get paid without chasing customers.</Text>
    {testPasswordAuthEnabled && <Text style={ui.subtitle}>Private TEST access for existing accounts. No public registration.</Text>}
    <Field label="Work email" value={email} onChangeText={value => { setEmail(value); setSent(false); setEmailCode(''); setError(null); setRateLimited(false); }} autoCapitalize="none" keyboardType="email-address" autoComplete="email" editable={!busy} />
    {method === 'password' && testPasswordAuthEnabled && <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCorrect={false} autoCapitalize="none" autoComplete="current-password" editable={!busy} />}
    {method === 'link' && sent && <>
      <Text style={[ui.subtitle, { marginTop: 20 }]}>Open the newest sign-in link on this device using the same TabBeagle app that requested it. If the email also shows a code, enter it here instead.</Text>
      <Field label="Email verification code (if shown)" value={emailCode} onChangeText={setEmailCode} keyboardType="number-pad" autoCapitalize="none" maxLength={8} editable={!busy} />
      <Button title="Verify email code" secondary onPress={verifyEmailCode} busy={busy} disabled={!/^[0-9]{6,8}$/.test(emailCode.trim())} />
    </>}
    <ErrorText message={error} />
    <Button title={method === 'password' ? 'Sign in with password' : sent ? 'Send a new link' : 'Send sign-in link'} onPress={signIn} busy={busy} disabled={method === 'link' && rateLimited} />
    {testPasswordAuthEnabled && <>
      <Button title={method === 'password' ? 'Use email sign-in link instead' : 'Sign in with password instead'} secondary disabled={busy} onPress={() => { setMethod(method === 'password' ? 'link' : 'password'); setError(null); setSent(false); }} />
      <Text style={[ui.subtitle, { marginTop: 18 }]}>First time using a password? Sign in with your existing email link once, then choose “Account security · Create TEST password” from your Dashboard.</Text>
    </>}
  </Form>;
}
