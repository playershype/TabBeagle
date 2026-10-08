/**
 * The redirect MUST match the URI scheme registered by the installed binary.
 * Never use a shared callback scheme for parallel TEST APKs: the wrong binary
 * cannot exchange a PKCE code because it lacks the initiating code verifier.
 */
export const AUTH_CALLBACK_PATH = 'auth/callback';

export function callbackCode(value: string, expectedRedirect: string): string | null {
  const url = new URL(value);
  const expected = new URL(expectedRedirect);
  // Compare the complete callback identity, not just a universal "tabbeagle" scheme.
  if (url.protocol !== expected.protocol ||
      url.hostname !== expected.hostname ||
      url.pathname !== expected.pathname) return null;
  if (url.searchParams.has('error') || url.searchParams.has('error_description')) {
    throw new Error('The sign-in link expired or was rejected. Request a new link.');
  }
  const codes = url.searchParams.getAll('code');
  if (codes.length !== 1 || !codes[0]) throw new Error('This sign-in link is incomplete. Request a new link.');
  return codes[0];
}
