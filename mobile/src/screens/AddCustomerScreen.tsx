import React, { useRef, useState } from 'react';
import { Text } from 'react-native';
import * as Crypto from 'expo-crypto';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createCustomer } from '../lib/api';
import { useOrganization } from '../lib/org';
import type { RootStackParams } from '../types';
import { Button, ErrorText, Field, Form, messageOf, ui } from '../components/UI';
export default function AddCustomerScreen({ navigation }: NativeStackScreenProps<RootStackParams, 'AddCustomer'>) {
  const org = useOrganization();
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const retry = useRef<{ payload: string; id: string }>(); const running = useRef(false);
  async function save() {
    if (running.current) return;
    running.current = true; setBusy(true); setError(null);
    try {
      if (!name.trim()) throw new Error('Enter a customer name.');
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Enter a valid email or leave it empty.');
      const data = { organizationId: org.id, displayName: name.trim(), billingEmail: email.trim().toLowerCase() || null };
      const payload = JSON.stringify(data);
      if (retry.current?.payload !== payload) retry.current = { payload, id: Crypto.randomUUID() };
      await createCustomer({ ...data, requestId: retry.current.id });
      navigation.goBack();
    } catch (e) { setError(messageOf(e)); }
    finally { running.current = false; setBusy(false); }
  }
  return <Form><Text style={ui.subtitle}>Save a customer for {org.name}.</Text>
    <Field label="Customer name" value={name} onChangeText={setName} maxLength={160} editable={!busy} />
    <Field label="Billing email (optional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" maxLength={254} editable={!busy} />
    <ErrorText message={error} /><Button title="Save customer" onPress={save} busy={busy} />
  </Form>;
}
