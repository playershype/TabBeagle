// The default is retained for original v0.1 previews and backward-compatible unit tests.
// Standalone test flavors MUST provide their own build-time callback URL.
export const AUTH_REDIRECT = 'tabbeagle://auth/callback';
export function callbackCode(value: string, redirectTo: string = AUTH_REDIRECT): string | null {
  const url = new URL(value);
  const redirect = new URL(redirectTo);
  if (url.protocol !== redirect.protocol || url.hostname !== redirect.hostname || url.pathname !== redirect.pathname) return null;
  if (url.searchParams.has('error') || url.searchParams.has('error_description')) {
    throw new Error('The sign-in link expired or was rejected. Request a new link.');
  }
  const codes = url.searchParams.getAll('code');
  if (codes.length !== 1 || !codes[0]) throw new Error('This sign-in link is incomplete. Request a new link.');
  return codes[0];
}
