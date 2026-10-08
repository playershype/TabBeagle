import React, { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createCustomer } from '../lib/api';
import { clearPending, loadPending, persistRequest } from '../lib/retry';
import { activePendingKey } from '../lib/pendingAccount';
import { useOrganization } from '../lib/org';
import type { RootStackParams } from '../types';
import { Button, ErrorText, Field, Form, messageOf, ui } from '../components/UI';
export default function AddCustomerScreen({ navigation }: NativeStackScreenProps<RootStackParams, 'AddCustomer'>) {
  const org = useOrganization();
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      const key = await activePendingKey(org.id, 'customer');
      const pending = await loadPending(AsyncStorage, key);
      if (!pending || !active || running.current) return;
      const raw: unknown = JSON.parse(pending.payload);
      if (typeof raw !== 'object' || raw === null) return;
      const draft = raw as Record<string, unknown>;
      if (draft.organizationId !== org.id || typeof draft.displayName !== 'string' ||
          !(draft.billingEmail === null || typeof draft.billingEmail === 'string')) return;
      setName(draft.displayName);
      setEmail(draft.billingEmail ?? '');
    })().catch(() => { if (active) setError('Unable to restore an interrupted customer draft. Verify the existing record before saving again.'); });
    return () => { active = false; };
  }, [org.id]);
  async function save() {
    if (running.current) return;
    running.current = true; setBusy(true); setError(null);
    try {
      if (!name.trim()) throw new Error('Enter a customer name.');
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Enter a valid email or leave it empty.');
      const data = { organizationId: org.id, displayName: name.trim(), billingEmail: email.trim().toLowerCase() || null };
      const payload = JSON.stringify(data);
      const key = await activePendingKey(org.id, 'customer');
      const pending = await persistRequest(AsyncStorage, key, payload, () => Crypto.randomUUID());
      await createCustomer({ ...data, requestId: pending.id });
      try { await clearPending(AsyncStorage, key, pending); } catch { /* harmless idempotent replay */ }
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
