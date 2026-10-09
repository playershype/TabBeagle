/**
 * Native-only fallback for TEST emails. Never open, fetch or log the pasted URL.
 * Accept only the expected Supabase Auth verify endpoint to prevent token exfiltration.
 */
export type EmailProof = { kind: 'email-code'; token: string } | { kind: 'magic-link'; tokenHash: string };
export function parseEmailProof(input: string, expectedSupabaseUrl: string): EmailProof {
  const trimmed = input.trim();
  if (/^[0-9]{6}$/.test(trimmed)) return { kind: 'email-code', token: trimmed };
  if (trimmed.length === 0 || trimmed.length > 4096) throw new Error('Paste the newest Supabase sign-in link or enter its six-digit email code.');
  let actual: URL, expected: URL;
  try { actual = new URL(trimmed); expected = new URL(expectedSupabaseUrl); }
  catch { throw new Error('This is not a valid Supabase sign-in link. Use Copy link in Gmail rather than opening it.'); }
  if (actual.protocol !== 'https:' || actual.origin !== expected.origin ||
      actual.pathname !== '/auth/v1/verify' || actual.username || actual.password || actual.hash) {
    throw new Error('Only a sign-in link from the configured Supabase TEST project is accepted.');
  }
  const types = actual.searchParams.getAll('type');
  if (types.length !== 1 || types[0] !== 'magiclink') throw new Error('This is not an email sign-in link for an existing TEST account.');
  const tokens = [...actual.searchParams.getAll('token'), ...actual.searchParams.getAll('token_hash')];
  if (tokens.length !== 1 || !/^[A-Za-z0-9_-]{20,512}$/.test(tokens[0])) {
    throw new Error('The link has no valid one-time verification token. Copy a fresh link without opening it.');
  }
  return { kind: 'magic-link', tokenHash: tokens[0] };
}
