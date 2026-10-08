import React, { useRef, useState } from 'react';
import { Text } from 'react-native';
import { getSupabase } from '../lib/supabase';
import { testPasswordError } from '../lib/testPasswordPolicy';
import { Button, ErrorText, Field, Form, messageOf, ui } from '../components/UI';

export default function AccountPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  async function save() {
    if (running.current) return;
    const validationError = testPasswordError(password, confirmation);
    if (validationError) { setError(validationError); return; }
    running.current = true;
    setBusy(true); setError(null);
    try {
      const auth = getSupabase().auth;
      // Verify the session against the auth server; never edit auth.users via SQL.
      const current = await auth.getUser();
      if (current.error || !current.data.user) throw new Error('Your session expired. Sign in again.');
      const result = await auth.updateUser({ password });
      if (result.error) throw result.error;
      setPassword(''); setConfirmation(''); setDone(true);
    } catch (e) {
      setError(messageOf(e));
    } finally { running.current = false; setBusy(false); }
  }
  return <Form>
    <Text style={ui.title}>Set up a TEST password</Text>
    <Text style={ui.subtitle}>Only for your existing, verified TabBeagle TEST account. This is not public registration. Use a unique password of 12 or more characters; do not share it.</Text>
    {done ? <>
      <Text accessibilityRole="alert" style={ui.subtitle}>Password saved. You can now sign out and choose “Sign in with password” using this same work email.</Text>
    </> : <>
      <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" editable={!busy} maxLength={128}/>
      <Field label="Confirm password" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" editable={!busy} maxLength={128}/>
      <ErrorText message={error} />
      <Button title="Save TEST password" busy={busy} onPress={save} />
    </>}
    <Text style={ui.subtitle}>If Supabase requests reauthentication, sign in again using your existing method and return here. No password is stored in the app or our database.</Text>
  </Form>;
}
