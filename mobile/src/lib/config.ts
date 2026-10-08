export function configurationErrors(input: { apiUrl?: string; supabaseUrl?: string; anonKey?: string }): string[] {
  const errors: string[] = [];
  for (const [name, value] of [['API', input.apiUrl], ['Supabase', input.supabaseUrl]]) {
    try {
      const url = new URL(value ?? '');
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error();
    } catch { errors.push(`${name} needs a valid HTTPS URL.`); }
  }
  if (!input.anonKey?.trim()) errors.push('The public Supabase key is missing.');
  if (input.anonKey?.startsWith('sb_secret_')) errors.push('A private key cannot be used in this app.');
  return errors;
}
export const config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, ''),
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
};
export const configErrors = configurationErrors(config);
// Only the isolated Supabase TEST project can expose password enrollment.
// Do not rely on a separate Expo flag that may be omitted in a distributed build.
export const isIsolatedTestProject = (url?: string) => url === 'https://gaileljkciseopfgwsbc.supabase.co';
export const testPasswordAuthEnabled = isIsolatedTestProject(config.supabaseUrl);
