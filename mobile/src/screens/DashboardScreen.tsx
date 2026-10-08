import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Invoice, RootStackParams } from '../types';
import { fetchInvoices } from '../lib/api';
import { fmtMoney, outstandingByCurrency, daysOverdue, todayIn } from '../lib/aging';
import { useOrganization } from '../lib/org';
import { getSupabase } from '../lib/supabase';
import { testPasswordAuthEnabled } from '../lib/config';
import { Button, ErrorText, messageOf, ui } from '../components/UI';
export default function DashboardScreen({ navigation }: NativeStackScreenProps<RootStackParams, 'Dashboard'>) {
  const org = useOrganization();
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setBusy(true); setError(null);
    try { setInvoices(await fetchInvoices(org.id)); } catch (e) { setError(messageOf(e)); }
    finally { setBusy(false); }
  }, [org.id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  async function signOut() {
    try { const { error } = await getSupabase().auth.signOut({ scope: 'local' }); if (error) throw error; }
    catch (e) { setError(messageOf(e)); }
  }
  const totals = outstandingByCurrency(invoices ?? []);
  const today = todayIn(org.timezone);
  return <View style={ui.page}><FlatList data={invoices ?? []} keyExtractor={i => i.id}
    contentContainerStyle={{ padding: 20, paddingBottom: 36 }} refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}
    ListHeaderComponent={<>
      <Text style={ui.title}>{org.name}</Text><Text style={ui.subtitle}>Your invoices, in one place.</Text>
      {testPasswordAuthEnabled && <Text style={[ui.subtitle, { fontSize: 12 }]}>AUTH FIX LAB · Magic link return test</Text>}
      <ErrorText message={error} />
      {error && <Button title="Retry loading" secondary onPress={load} busy={busy} />}
      {invoices !== null && <View style={ui.card}><Text style={ui.label}>Outstanding balance{error ? ' · Last loaded' : ''}</Text>
        {Object.keys(totals).length ? Object.entries(totals).map(([currency, amount]) => <Text key={currency} style={ui.title}>{fmtMoney(amount, currency)} {currency}</Text>) : <Text style={ui.title}>{fmtMoney(0)}</Text>}
        <Text style={ui.subtitle}>{invoices.length} invoice{invoices.length === 1 ? '' : 's'}</Text>
      </View>}
      <Button title="+ New invoice" onPress={() => navigation.navigate('AddInvoice')} />
      <Button title="+ New customer" secondary onPress={() => navigation.navigate('AddCustomer')} />
      <Text style={[ui.label, { marginBottom: 10 }]}>Invoices</Text>
    </>}
    ListEmptyComponent={invoices !== null && !error ? <Text style={ui.subtitle}>No invoices yet. Start by adding a customer and their first invoice.</Text> : null}
    renderItem={({ item }) => {
      const days = daysOverdue(item.due_date, today);
      return <Pressable accessibilityRole="button" accessibilityLabel={`Invoice ${item.invoice_number}, ${item.customer?.display_name}, ${fmtMoney(item.outstanding_amount_minor, item.currency)}`} onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id })} style={ui.card}>
        <Text style={[ui.label, { marginTop: 0 }]}>{item.customer?.display_name ?? 'Customer unavailable'}</Text>
        <Text style={ui.subtitle}>{item.invoice_number} · Due {item.due_date}</Text>
        <Text style={ui.title}>{fmtMoney(item.outstanding_amount_minor, item.currency)}</Text>
        <Text style={ui.subtitle}>{item.payment_status.replace('_', ' ')}{!['PAID','VOID'].includes(item.payment_status) ? ` · ${days > 0 ? `${days} days overdue` : days === 0 ? 'Due today' : 'Not yet due'}` : ''}</Text>
      </Pressable>;
    }}
    ListFooterComponent={<>
      {testPasswordAuthEnabled && <Button title="Account security · Create TEST password" secondary onPress={() => navigation.navigate('AccountPassword')} />}
      <Button title="Sign out" secondary onPress={signOut} />
    </>}
  /></View>;
}
