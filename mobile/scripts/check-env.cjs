const required = ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];
const missing = required.filter(key => !process.env[key]?.trim());
if (missing.length) throw new Error('Missing build variables: ' + missing.join(', '));
for (const key of required.slice(0, 2)) {
  const url = new URL(process.env[key]);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error(key + ' must be a clean HTTPS URL');
}
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (key.startsWith('sb_secret_')) throw new Error('Never bundle a private key');
if (!key.startsWith('sb_publishable_')) {
  let claims;
  try { claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')); } catch { throw new Error('Invalid public Supabase key'); }
  if (claims.role !== 'anon') throw new Error('Only the anon/public key can be bundled');
}
console.log('Public environment validated.');
