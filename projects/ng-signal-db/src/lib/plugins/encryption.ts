import { NgSignalDBPlugin } from '../core/types';

export interface EncryptionConfig {
  key: CryptoKey;
  iv: Uint8Array;
}

export function withEncryption(config: EncryptionConfig): NgSignalDBPlugin {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return {
    onBeforeWrite: async (storeName, data) => {
      const stringified = JSON.stringify(data);
      const encoded = encoder.encode(stringified);
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: config.iv as any },
        config.key,
        encoded as any
      );
      return { encrypted: Array.from(new Uint8Array(encrypted)) };
    },
    onAfterRead: async (storeName, data) => {
      if (!data || !data.encrypted) return data;
      const encrypted = new Uint8Array(data.encrypted);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: config.iv as any },
        config.key,
        encrypted as any
      );
      const decoded = decoder.decode(decrypted);
      return JSON.parse(decoded);
    }
  };
}
