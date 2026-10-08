import app from '../../app.json';
export const AUTH_REDIRECT = `${app.expo.scheme}://auth/callback`;
export function callbackCode(value: string): string | null {
  const url = new URL(value);
  const expected = new URL(AUTH_REDIRECT);
  if (url.protocol !== expected.protocol || url.hostname !== expected.hostname || url.pathname !== expected.pathname) return null;
  if (url.searchParams.has('error') || url.searchParams.has('error_description')) {
    throw new Error('The sign-in link expired or was rejected. Request a new link.');
  }
  const codes = url.searchParams.getAll('code');
  if (codes.length !== 1 || !codes[0]) throw new Error('This sign-in link is incomplete. Request a new link.');
  return codes[0];
}
