import { getSupabase } from './supabase';
import { pendingKey, type PendingKind } from './retry';

/** Scoped by Supabase's authenticated user ID and organization ID. */
export async function activePendingKey(organizationId: string, kind: PendingKind): Promise<string> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error || !data.session) throw new Error('Sign in again before saving records.');
  return pendingKey(data.session.user.id, organizationId, kind);
}
