import React from 'react';
import { Image, Text, View } from 'react-native';
import { Button, ui } from '../components/UI';
import { colors } from '../theme';

// Landing screen shown before sign-in. Describes only what the app does today.
// No public sign-up exists in this build, so there is no "Create account" button.
const POINTS = [
  'Track every invoice and its due date',
  'See outstanding and overdue balances at a glance',
  'Add customers and invoices in a few taps',
];

export default function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return <View style={[ui.page, { padding: 24, justifyContent: 'center' }]}>
    <Image source={require('../../assets/brand.png')} accessibilityLabel="TabBeagle" style={{ width: 120, height: 120, alignSelf: 'center', borderRadius: 24 }} />
    <Text style={[ui.title, { textAlign: 'center', marginTop: 24 }]}>Get paid without chasing customers.</Text>
    <Text style={[ui.subtitle, { textAlign: 'center' }]}>See who owes you, what is overdue, and where to follow up next.</Text>
    <View style={{ marginTop: 8 }}>
      {POINTS.map(point => <Text key={point} style={{ fontSize: 15, color: colors.ink, marginVertical: 6 }}>{`•  ${point}`}</Text>)}
    </View>
    <Button title="Sign in" onPress={onStart} />
    <Text style={[ui.subtitle, { textAlign: 'center', marginTop: 16, fontSize: 12 }]}>TEST build. Sign-in is for existing accounts only.</Text>
  </View>;
}
