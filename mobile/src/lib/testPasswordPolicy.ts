// TEST-only enrollment policy. Supabase Auth remains the source of truth.
export function testPasswordError(password: string, confirmation: string): string | null {
  if (password.length < 12 || password.length > 128) return 'Use a unique password with 12 to 128 characters.';
  if (password !== confirmation) return 'The passwords do not match.';
  return null;
}
