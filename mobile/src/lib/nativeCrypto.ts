import 'fast-text-encoding';
import * as ExpoCrypto from 'expo-crypto';
// Only the WebCrypto operations used by Supabase PKCE on Hermes.
const existing = globalThis.crypto;
if (!existing?.getRandomValues || !existing?.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      getRandomValues: existing?.getRandomValues?.bind(existing) ?? ExpoCrypto.getRandomValues,
      subtle: existing?.subtle ?? {
        digest: (algorithm: string, data: BufferSource) => {
          if (algorithm !== 'SHA-256') throw new Error('Unsupported digest.');
          return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data);
        },
      },
    },
  });
}
