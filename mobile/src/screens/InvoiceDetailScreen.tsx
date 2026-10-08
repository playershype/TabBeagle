import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Invoice, RootStackParams } from '../types';
import { fetchInvoice } from '../lib/api';
import { fmtMoney } from '../lib/aging';
import { Button, ErrorText, Form, messageOf, ui } from '../components/UI';
export default function InvoiceDetailScreen({ route }: NativeStackScreenProps<RootStackParams, 'InvoiceDetail'>) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setBusy(true); setError(null);
    try { setInvoice(await fetchInvoice(route.params.invoiceId)); } catch (e) { setError(messageOf(e)); }
    finally { setBusy(false); }
  }, [route.params.invoiceId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return <Form><ErrorText message={error} />{invoice && <>
    <Text style={ui.title}>{invoice.invoice_number}</Text><Text style={ui.subtitle}>{invoice.customer?.display_name}</Text>
    <View style={ui.card}><Text style={ui.label}>Outstanding</Text><Text style={ui.title}>{fmtMoney(invoice.outstanding_amount_minor, invoice.currency)}</Text>
      <Text style={ui.subtitle}>Original: {fmtMoney(invoice.original_amount_minor, invoice.currency)}</Text>
      <Text style={ui.subtitle}>Status: {invoice.payment_status.replace('_', ' ')}</Text>
    </View>
    <Text style={ui.label}>Billing email</Text><Text style={ui.subtitle}>{invoice.customer?.billing_email || 'Not provided'}</Text>
    <Text style={ui.label}>Issued</Text><Text style={ui.subtitle}>{invoice.issue_date}</Text>
    <Text style={ui.label}>Due</Text><Text style={ui.subtitle}>{invoice.due_date}</Text>
    <Text style={ui.subtitle}>Saved to your business account.</Text>
  </>}<Button title="Refresh invoice" secondary onPress={load} busy={busy} /></Form>;
}
