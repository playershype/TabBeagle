import React, { useCallback, useRef, useState } from 'react';
import { Text, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Crypto from 'expo-crypto';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createInvoice, fetchCustomers } from '../lib/api';
import { useOrganization } from '../lib/org';
import { amountMinor, isDate, todayIn } from '../lib/aging';
import type { Customer, RootStackParams } from '../types';
import { Button, ErrorText, Field, Form, messageOf, ui } from '../components/UI';
export default function AddInvoiceScreen({ navigation }: NativeStackScreenProps<RootStackParams, 'AddInvoice'>) {
  const org = useOrganization();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [number, setNumber] = useState(''); const [amount, setAmount] = useState('');
  const [issue, setIssue] = useState(() => todayIn(org.timezone)); const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const retry = useRef<{ payload: string; id: string }>(); const running = useRef(false);
  const load = useCallback(async () => {
    setError(null);
    try { setCustomers((await fetchCustomers(org.id)).filter(c => c.status === 'ACTIVE')); }
    catch (e) { setError(messageOf(e)); }
  }, [org.id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  async function save() {
    if (running.current) return;
    running.current = true; setBusy(true); setError(null);
    try {
      if (!customerId || !number.trim()) throw new Error('Choose a customer and enter an invoice number.');
      if (!isDate(issue) || !isDate(due) || due < issue) throw new Error('Use valid dates (YYYY-MM-DD). Due date must be on or after issue date.');
      const data = { organizationId: org.id, customerId, invoiceNumber: number.trim(), amountMinor: amountMinor(amount), currency: 'USD' as const, issueDate: issue, dueDate: due };
      const payload = JSON.stringify(data);
      if (retry.current?.payload !== payload) retry.current = { payload, id: Crypto.randomUUID() };
      const saved = await createInvoice({ ...data, requestId: retry.current.id });
      navigation.replace('InvoiceDetail', { invoiceId: saved.id });
    } catch (e) { setError(messageOf(e)); }
    finally { running.current = false; setBusy(false); }
  }
  return <Form>
    <Text style={ui.label}>Customer</Text>
    {customers?.map(customer => <Pressable accessibilityRole="radio" accessibilityState={{ selected: customerId === customer.id }} key={customer.id} disabled={busy} onPress={() => setCustomerId(customer.id)} style={[ui.card, customerId === customer.id && { borderColor: '#0F1E36', borderWidth: 2 }]}><Text>{customer.display_name}{customerId === customer.id ? ' · Selected' : ''}</Text></Pressable>)}
    {customers?.length === 0 && <Text style={ui.subtitle}>Create your first customer to continue.</Text>}
    {!customers && <Button title="Load customers" secondary onPress={load} />}
    <Button title="+ New customer" secondary disabled={busy} onPress={() => navigation.navigate('AddCustomer')} />
    <Field label="Invoice number" value={number} onChangeText={setNumber} maxLength={80} editable={!busy} />
    <Field label="Amount (USD)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="1250.00" editable={!busy} />
    <Field label="Issue date (YYYY-MM-DD)" value={issue} onChangeText={setIssue} autoCapitalize="none" maxLength={10} editable={!busy} />
    <Field label="Due date (YYYY-MM-DD)" value={due} onChangeText={setDue} autoCapitalize="none" maxLength={10} editable={!busy} />
    <ErrorText message={error} /><Button title="Save invoice" onPress={save} busy={busy} disabled={!customerId} />
  </Form>;
}
