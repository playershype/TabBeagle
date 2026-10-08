import React, { useRef, useState } from 'react';
import { Image, Text } from 'react-native';
import { getSupabase } from '../lib/supabase';
import { AUTH_REDIRECT } from '../lib/authCallback';
import { Button, ErrorText, Field, Form, messageOf, ui } from '../components/UI';
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const running = useRef(false);
  async function send() {
    if (running.current) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email.'); return; }
    if (rateLimited) return;
    running.current = true; setBusy(true); setError(null);
    try {
      const { error } = await getSupabase().auth.signInWithOtp({
        email: email.trim().toLowerCase(), options: { emailRedirectTo: AUTH_REDIRECT },
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      const message = messageOf(e);
      if (/rate limit|too many requests|429/i.test(message)) {
        setRateLimited(true);
        setError('Email sending is temporarily limited. Wait before trying again. Your saved invoices are safe.');
      } else setError(message);
    }
    finally { running.current = false; setBusy(false); }
  }
  return <Form>
    <Image source={require('../../assets/brand.png')} accessibilityLabel="TabBeagle" style={{ width: 128, height: 128, alignSelf: 'center', marginTop: 36, marginBottom: 24, borderRadius: 24 }} />
    <Text style={ui.title}>Welcome to TabBeagle</Text>
    <Text style={ui.subtitle}>Get paid without chasing customers.</Text>
    <Field label="Work email" value={email} onChangeText={value => { setEmail(value); setSent(false); setRateLimited(false); }} autoCapitalize="none" keyboardType="email-address" autoComplete="email" editable={!busy} />
    {sent && <Text style={[ui.subtitle, { marginTop: 20 }]}>Check your inbox. Open the newest sign-in link on this device. If it expired, request another below.</Text>}
    <ErrorText message={error} />
    <Button title={sent ? 'Send a new link' : 'Send sign-in link'} onPress={send} busy={busy} disabled={rateLimited} />
  </Form>;
}
