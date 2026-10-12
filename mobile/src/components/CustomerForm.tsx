import React from 'react';
import { Switch, Text, View } from 'react-native';
import { Field, ui } from './UI';
import { colors } from '../theme';
import type { CustomerDraft } from '../lib/customerForm';

// The same fields are used to create a customer and to edit a saved profile.
export default function CustomerForm({ draft, onChange, disabled }: { draft: CustomerDraft; onChange: (patch: Partial<CustomerDraft>) => void; disabled: boolean }) {
  const text = (key: keyof CustomerDraft) => (value: string) => onChange({ [key]: value } as Partial<CustomerDraft>);
  const section = (title: string) => <Text style={[ui.label, { fontSize: 16, marginTop: 26 }]}>{title}</Text>;
  return <View>
    {section('Contact')}
    <Field label="Customer or business name" value={draft.displayName} onChangeText={text('displayName')} maxLength={160} editable={!disabled} />
    <Field label="Contact person" value={draft.contactName} onChangeText={text('contactName')} maxLength={120} editable={!disabled} />
    <Field label="Phone" value={draft.phone} onChangeText={text('phone')} keyboardType="phone-pad" maxLength={30} editable={!disabled} />
    <Field label="Billing email" value={draft.billingEmail} onChangeText={text('billingEmail')} keyboardType="email-address" autoCapitalize="none" maxLength={254} editable={!disabled} />
    <Field label="Alternate email" value={draft.alternateEmail} onChangeText={text('alternateEmail')} keyboardType="email-address" autoCapitalize="none" maxLength={254} editable={!disabled} />

    {section('Company and addresses')}
    <Field label="Company name" value={draft.companyName} onChangeText={text('companyName')} maxLength={160} editable={!disabled} />
    <Field label="Billing address" value={draft.billingAddress} onChangeText={text('billingAddress')} multiline maxLength={300} editable={!disabled} />
    <Field label="Work address" value={draft.workAddress} onChangeText={text('workAddress')} multiline maxLength={300} editable={!disabled} />

    {section('Collections')}
    <Field label="Payment terms (days, 0 = due on receipt)" value={draft.paymentTermsDays} onChangeText={text('paymentTermsDays')} keyboardType="number-pad" maxLength={3} editable={!disabled} />
    <Field label="Preferred collection day (1–28, optional)" value={draft.collectionDay} onChangeText={text('collectionDay')} keyboardType="number-pad" maxLength={2} editable={!disabled} />
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.line }}>
      <Text style={{ fontSize: 15, color: colors.ink, flex: 1, marginRight: 12 }}>Send payment reminders to this customer</Text>
      <Switch value={draft.remindersEnabled} onValueChange={value => onChange({ remindersEnabled: value })} disabled={disabled} accessibilityLabel="Send payment reminders" />
    </View>

    {section('Notes and tags')}
    <Field label="Internal notes (only you see these)" value={draft.notes} onChangeText={text('notes')} multiline maxLength={2000} editable={!disabled} />
    <Field label="Tags, separated by commas (e.g. VIP, referral)" value={draft.tags} onChangeText={text('tags')} maxLength={400} editable={!disabled} />
  </View>;
}
