import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '../theme';
export function Button({ title, onPress, busy = false, disabled = false, secondary = false }: { title: string; onPress: () => void; busy?: boolean; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} onPress={onPress} disabled={disabled || busy} style={[ui.button, secondary && ui.secondary, (disabled || busy) && { opacity: .55 }]}>
    {busy ? <ActivityIndicator color={secondary ? colors.ink : '#fff'} /> : <Text style={[ui.buttonText, secondary && { color: colors.ink }]}>{title}</Text>}
  </Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View><Text style={ui.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} {...props} style={[ui.input, props.style]} /></View>;
}
export function ErrorText({ message }: { message: string | null }) {
  return message ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={ui.error}>{message}</Text> : null;
}
export function Form({ children }: { children: React.ReactNode }) {
  return <ScrollView style={ui.page} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>{children}</ScrollView>;
}
export const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please retry.';
export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  title: { fontSize: 27, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  subtitle: { fontSize: 15, color: colors.muted, lineHeight: 22, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.ink, marginTop: 16, marginBottom: 7 },
  input: { backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, color: colors.ink, minHeight: 50 },
  button: { minHeight: 50, backgroundColor: colors.ink, borderRadius: 12, justifyContent: 'center', alignItems: 'center', padding: 14, marginTop: 14 },
  secondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  error: { fontSize: 14, lineHeight: 21, color: colors.rust, marginVertical: 12 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 18, borderColor: colors.line, borderWidth: 1, marginVertical: 6 },
});
