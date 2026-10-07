export const AUTH_REDIRECT = 'tabbeagle://auth/callback';
export function callbackCode(value: string): string | null {
  const url = new URL(value);
  if (url.protocol !== 'tabbeagle:' || url.hostname !== 'auth' || url.pathname !== '/callback') return null;
  if (url.searchParams.has('error') || url.searchParams.has('error_description')) {
    throw new Error('The sign-in link expired or was rejected. Request a new link.');
  }
  const codes = url.searchParams.getAll('code');
  if (codes.length !== 1 || !codes[0]) throw new Error('This sign-in link is incomplete. Request a new link.');
  return codes[0];
}
