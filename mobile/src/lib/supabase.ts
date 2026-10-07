import 'react-native-url-polyfill/auto';
import './nativeCrypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAuthClient } from './authClient';
import { config, configErrors } from './config';
let client: ReturnType<typeof createAuthClient> | undefined;
export function getSupabase() {
  if (configErrors.length) throw new Error('This build needs its test environment configured.');
  return client ??= createAuthClient(config.supabaseUrl!, config.anonKey!, AsyncStorage);
}
