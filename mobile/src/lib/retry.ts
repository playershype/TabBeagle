/**
 * Persistent idempotency for M1 invoice/customer creates.
 * A pending request is written before a network POST and scoped to the
 * authenticated user and organization. A process restart can restore the
 * exact draft and request ID, avoiding an accidental second creation.
 *
 * Do not store passwords, JWTs or payment-card data in these drafts.
 */
export type PendingSave = { payload: string; id: string };
export type PendingKind = 'invoice' | 'customer';
export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
};

export function pendingKey(userId: string, organizationId: string, kind: PendingKind): string {
  if (!/^[a-f\d-]{36}$/i.test(userId) || !/^[a-f\d-]{36}$/i.test(organizationId)) {
    throw new Error('An authenticated account and business are required.');
  }
  return `tabbeagle:m1:pending:v1:${userId}:${organizationId}:${kind}`;
}

export function stableRequest(current: PendingSave | undefined, payload: string, makeId: () => string): PendingSave {
  return current?.payload === payload ? current : { payload, id: makeId() };
}

export async function loadPending(store: KeyValueStore, key: string): Promise<PendingSave | null> {
  const value = await store.getItem(key);
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const item = parsed as Record<string, unknown>;
    if (typeof item.id !== 'string' || typeof item.payload !== 'string' ||
        item.id.length > 100 || item.payload.length > 16384) return null;
    return { id: item.id, payload: item.payload };
  } catch {
    return null;
  }
}

export async function persistRequest(store: KeyValueStore, key: string, payload: string, makeId: () => string): Promise<PendingSave> {
  const old = await loadPending(store, key);
  const current = stableRequest(old ?? undefined, payload, makeId);
  // Fails closed: if storage fails, don't send a request without a durable key.
  await store.setItem(key, JSON.stringify(current));
  return current;
}

export async function clearPending(store: KeyValueStore, key: string, expected: PendingSave): Promise<boolean> {
  const current = await loadPending(store, key);
  if (!current || current.id !== expected.id || current.payload !== expected.payload) return false;
  await store.removeItem(key);
  return true;
}

export function transportMessage(error: unknown): Error | null {
  if (!(error instanceof Error)) return null;
  if (error.name === 'AbortError') {
    return new Error('Connection timed out. Restore internet and tap Save again with the same details. The same request ID will be reused.');
  }
  if (/network request failed|failed to fetch|networkerror|fetch failed/i.test(error.message)) {
    return new Error('Network unavailable. Restore internet and tap Save again with the same details. The same request ID will be reused.');
  }
  return null;
}
