/**
 * Keep one request identifier for exactly the same draft payload.
 * Reuse it after a timeout or an uncertain response; never derive the key from a timestamp.
 * It lives in the screen's ref and is not durable across app termination (M1 follow-up).
 */
export type PendingSave = { payload: string; id: string };
export function stableRequest(current: PendingSave | undefined, payload: string, makeId: () => string): PendingSave {
  return current?.payload === payload ? current : { payload, id: makeId() };
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
