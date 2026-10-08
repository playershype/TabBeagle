import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ZodError, type ZodType } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function authenticatedClient(request: Request): Promise<SupabaseClient> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.match(/^Bearer \S+$/)) throw new HttpError(401, 'Sign in to continue.');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new HttpError(503, 'The test environment has not been configured.');
  const client = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  // Validate with the issuer, never trust a decoded JWT or a client-supplied org ID.
  const { data, error } = await client.auth.getUser(authorization.slice(7));
  if (error || !data.user) throw new HttpError(401, 'Your session expired. Sign in again.');
  return client;
}

export async function body<T>(request: Request, schema: ZodType<T>): Promise<T> {
  if (!request.headers.get('content-type')?.includes('application/json')) {
    throw new HttpError(415, 'Send JSON.');
  }
  // Enforce the limit while reading, including requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'A JSON body is required.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) { await reader.cancel(); throw new HttpError(413, 'Request is too large.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new HttpError(400, 'Invalid JSON.'); }
  return schema.parse(parsed);
}

export function databaseError(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === '42501') throw new HttpError(403, 'You cannot access or change this organization.');
  if (error.code === '23505' || error.code === 'P0001') throw new HttpError(409, 'This reference already exists or this retry has different data.');
  if (['23503', '23514', '22007', '22008', '22023', '22P02'].includes(error.code ?? '')) {
    throw new HttpError(400, 'Check the customer, amount, currency and dates.');
  }
  throw new HttpError(503, 'Data is temporarily unavailable. Please retry.');
}

export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}
export function route(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try { return await handler(request); }
    catch (error) {
      if (error instanceof ZodError) return json({ error: error.issues[0]?.message ?? 'Invalid input.' }, 400);
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      // Do not leak SQL, tokens, customer records or provider internals.
      return json({ error: 'Unable to complete the request. Please retry.' }, 503);
    }
  };
}
