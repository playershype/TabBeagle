import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Customer, Invoice, RootStackParams } from '../types';
import { fetchCustomer, fetchInvoices, updateCustomer } from '../lib/api';
import { daysOverdue, fmtMoney, outstandingByCurrency, todayIn } from '../lib/aging';
import { useOrganization } from '../lib/org';
import { draftFromCustomer, emptyDraft, termsLabel, toPayload, type CustomerDraft } from '../lib/customerForm';
import { Button, ErrorText, messageOf, ui } from '../components/UI';
import CustomerForm from '../components/CustomerForm';
import { colors } from '../theme';

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return <View style={{ marginTop: 12 }}>
    <Text style={[ui.label, { marginTop: 0, fontSize: 13, color: colors.muted }]}>{label}</Text>
    <Text style={{ fontSize: 16, color: colors.ink, lineHeight: 22 }}>{value || '—'}</Text>
  </View>;
}

export default function CustomerDetailScreen({ navigation, route }: NativeStackScreenProps<RootStackParams, 'CustomerDetail'>) {
  const org = useOrganization();
  const { customerId } = route.params;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CustomerDraft>(emptyDraft());
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const [c, all] = await Promise.all([fetchCustomer(customerId), fetchInvoices(org.id)]);
      setCustomer(c);
      setInvoices(all.filter(i => i.customer_id === customerId));
    } catch (e) { setError(messageOf(e)); }
    finally { setBusy(false); }
  }, [customerId, org.id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function save() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const updated = await updateCustomer(customerId, { organizationId: org.id, ...toPayload(draft) });
      setCustomer(updated);
      setEditing(false);
    } catch (e) { setError(messageOf(e)); }
    finally { setBusy(false); }
  }

  if (!customer) return <View style={ui.page}><ErrorText message={error} />{busy && <Text style={ui.subtitle}>Loading…</Text>}</View>;

  if (editing) return <ScrollView style={ui.page} contentContainerStyle={{ padding: 24, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
    <CustomerForm draft={draft} onChange={patch => setDraft(current => ({ ...current, ...patch }))} disabled={busy} />
    <ErrorText message={error} />
    <Button title="Save changes" onPress={save} busy={busy} />
    <Button title="Cancel" secondary disabled={busy} onPress={() => { setEditing(false); setError(null); }} />
  </ScrollView>;

  const open = invoices.filter(i => i.payment_status !== 'PAID' && i.payment_status !== 'VOID');
  const totals = outstandingByCurrency(open);
  const today = todayIn(org.timezone);
  const overdue = open.filter(i => daysOverdue(i.due_date, today) > 0);

  return <ScrollView style={ui.page} contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
    <Text style={ui.title}>{customer.display_name}</Text>
    {!!customer.company_name && <Text style={ui.subtitle}>{customer.company_name}</Text>}
    <ErrorText message={error} />

    <View style={ui.card}>
      <Text style={ui.label}>Outstanding</Text>
      {Object.keys(totals).length ? Object.entries(totals).map(([currency, amount]) => <Text key={currency} style={ui.title}>{fmtMoney(amount, currency)} {currency}</Text>) : <Text style={ui.title}>{fmtMoney(0)}</Text>}
      <Text style={ui.subtitle}>{overdue.length ? `${overdue.length} invoice${overdue.length === 1 ? '' : 's'} past due` : 'Nothing past due'}</Text>
    </View>

    <Button title="Edit profile" secondary onPress={() => { setDraft(draftFromCustomer(customer)); setEditing(true); setError(null); }} />

    <Text style={[ui.label, { fontSize: 16, marginTop: 26 }]}>Contact</Text>
    <Row label="Contact person" value={customer.contact_name} />
    <Row label="Phone" value={customer.phone} />
    <Row label="Billing email" value={customer.billing_email} />
    <Row label="Alternate email" value={customer.alternate_email} />

    <Text style={[ui.label, { fontSize: 16, marginTop: 26 }]}>Company and addresses</Text>
    <Row label="Company" value={customer.company_name} />
    <Row label="Billing address" value={customer.billing_address} />
    <Row label="Work address" value={customer.work_address} />

    <Text style={[ui.label, { fontSize: 16, marginTop: 26 }]}>Collections</Text>
    <Row label="Payment terms" value={termsLabel(customer.payment_terms_days)} />
    <Row label="Preferred collection day" value={customer.collection_day ? `Day ${customer.collection_day}` : 'Not set'} />
    <Row label="Payment reminders" value={customer.reminders_enabled === false ? 'Off' : 'On'} />

    <Text style={[ui.label, { fontSize: 16, marginTop: 26 }]}>Notes and tags</Text>
    <Row label="Tags" value={customer.tags?.length ? customer.tags.join(', ') : null} />
    <Row label="Internal notes" value={customer.notes} />

    <Text style={[ui.label, { fontSize: 16, marginTop: 26 }]}>Invoices ({invoices.length})</Text>
    {invoices.length === 0 && <Text style={ui.subtitle}>No invoices for this customer yet.</Text>}
    {invoices.map(invoice => <Pressable key={invoice.id} accessibilityRole="button" onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: invoice.id })} style={ui.card}>
      <Text style={ui.label}>{invoice.invoice_number} · Due {invoice.due_date}</Text>
      <Text style={ui.title}>{fmtMoney(invoice.outstanding_amount_minor, invoice.currency)}</Text>
      <Text style={ui.subtitle}>{invoice.payment_status.replace('_', ' ')}</Text>
    </Pressable>)}
  </ScrollView>;
}
