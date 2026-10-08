// Keep the email redirect in the JavaScript bundle aligned with the native
// Android URI scheme baked into this particular APK. In isolated builds set
// EXPO_PUBLIC_AUTH_SCHEME to exactly app.json expo.scheme before bundling.
export function redirectForScheme(scheme: string): string {
  if (!/^[a-z][a-z0-9+.-]{1,63}$/.test(scheme)) {
    throw new Error('Invalid application sign-in scheme.');
  }
  return `${scheme}://auth/callback`;
}

export const AUTH_REDIRECT = redirectForScheme(process.env.EXPO_PUBLIC_AUTH_SCHEME || 'tabbeagle');

export function callbackCode(value: string, expectedRedirect: string = AUTH_REDIRECT): string | null {
  const url = new URL(value);
  const expected = new URL(expectedRedirect);
  if (url.protocol !== expected.protocol || url.hostname !== expected.hostname || url.pathname !== expected.pathname) {
    return null;
  }
  const fragment = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : '');
  if (url.searchParams.has('error') || url.searchParams.has('error_description') ||
      fragment.has('error') || fragment.has('error_description')) {
    throw new Error('The sign-in link expired or was rejected. Request a new link.');
  }
  const codes = url.searchParams.getAll('code');
  if (codes.length !== 1 || !codes[0]) {
    throw new Error('This sign-in link is incomplete. Request a new link.');
  }
  return codes[0];
}
