import React, { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createCustomer } from '../lib/api';
import { clearPending, loadPending, persistRequest } from '../lib/retry';
import { activePendingKey } from '../lib/pendingAccount';
import { useOrganization } from '../lib/org';
import { draftFromPayload, emptyDraft, toPayload, type CustomerDraft } from '../lib/customerForm';
import type { RootStackParams } from '../types';
import { Button, ErrorText, Form, messageOf, ui } from '../components/UI';
import CustomerForm from '../components/CustomerForm';

export default function AddCustomerScreen({ navigation }: NativeStackScreenProps<RootStackParams, 'AddCustomer'>) {
  const org = useOrganization();
  const [draft, setDraft] = useState<CustomerDraft>(emptyDraft());
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
      const saved = raw as Record<string, unknown>;
      if (saved.organizationId !== org.id || typeof saved.displayName !== 'string') return;
      setDraft(draftFromPayload(saved));
    })().catch(() => { if (active) setError('Unable to restore an interrupted customer draft. Verify the existing record before saving again.'); });
    return () => { active = false; };
  }, [org.id]);
  async function save() {
    if (running.current) return;
    running.current = true; setBusy(true); setError(null);
    try {
      const data = { organizationId: org.id, ...toPayload(draft) };
      const key = await activePendingKey(org.id, 'customer');
      const pending = await persistRequest(AsyncStorage, key, JSON.stringify(data), () => Crypto.randomUUID());
      await createCustomer({ ...data, requestId: pending.id });
      try { await clearPending(AsyncStorage, key, pending); } catch { /* harmless idempotent replay */ }
      navigation.goBack();
    } catch (e) { setError(messageOf(e)); }
    finally { running.current = false; setBusy(false); }
  }
  return <Form><Text style={ui.subtitle}>Save a customer for {org.name}. Only the name is required.</Text>
    <CustomerForm draft={draft} onChange={patch => setDraft(current => ({ ...current, ...patch }))} disabled={busy} />
    <ErrorText message={error} /><Button title="Save customer" onPress={save} busy={busy} />
  </Form>;
}
