import { Alert } from 'react-native';

// Archiving hides a customer from the list but keeps its invoices and history, so the copy says so.
export function confirmArchiveCustomer(name: string, onConfirm: () => void) {
  Alert.alert(
    'Delete customer?',
    `${name} will be removed from your customer list. Their invoices and history are kept.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ],
  );
}
