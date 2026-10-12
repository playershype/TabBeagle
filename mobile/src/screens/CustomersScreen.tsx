import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Customer, RootStackParams } from '../types';
import { archiveCustomer, fetchCustomers } from '../lib/api';
import { confirmArchiveCustomer } from '../lib/customerActions';
import { useOrganization } from '../lib/org';
import { Button, ErrorText, messageOf, ui } from '../components/UI';

export default function CustomersScreen({ navigation }: NativeStackScreenProps<RootStackParams, 'Customers'>) {
  const org = useOrganization();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setBusy(true); setError(null);
    try { setCustomers(await fetchCustomers(org.id)); } catch (e) { setError(messageOf(e)); }
    finally { setBusy(false); }
  }, [org.id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  async function archive(item: Customer) {
    setError(null);
    try { await archiveCustomer(item.id, org.id); await load(); } catch (e) { setError(messageOf(e)); }
  }
  return <View style={ui.page}><FlatList data={customers ?? []} keyExtractor={c => c.id}
    contentContainerStyle={{ padding: 20, paddingBottom: 36 }} refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}
    ListHeaderComponent={<>
      <Text style={ui.title}>Customers</Text>
      <ErrorText message={error} />
      <Button title="+ New customer" onPress={() => navigation.navigate('AddCustomer')} />
    </>}
    ListEmptyComponent={customers !== null && !error ? <Text style={ui.subtitle}>No customers yet.</Text> : null}
    renderItem={({ item }) => <View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Customer ${item.display_name}`} onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })} style={ui.card}>
        <Text style={ui.title}>{item.display_name}</Text>
        {!!item.company_name && <Text style={ui.subtitle}>{item.company_name}</Text>}
        <Text style={ui.subtitle}>{item.contact_name || item.billing_email || 'No contact yet'}</Text>
        {!!item.tags?.length && <Text style={[ui.subtitle, { fontSize: 12 }]}>{item.tags.join(' · ')}</Text>}
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <View style={{ flex: 1 }}><Button title="Edit" secondary onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id, startEditing: true })} /></View>
        <View style={{ flex: 1 }}><Button title="Delete" secondary onPress={() => confirmArchiveCustomer(item.display_name, () => { void archive(item); })} /></View>
      </View>
    </View>}
  /></View>;
}
