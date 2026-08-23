import type { HostedPagePutOptions, HostedPageTextStorage } from "./repository";

export type HostedPageR2Bucket = {
  get: (key: string) => Promise<{ text: () => Promise<string> } | null>;
  put: (
    key: string,
    value: string,
    options?: {
      onlyIf?: Headers;
      httpMetadata?: {
        contentType?: string;
        cacheControl?: string;
      };
      customMetadata?: Record<string, string>;
    }
  ) => Promise<unknown | null>;
};

export function createR2HostedPageStorage(bucket: HostedPageR2Bucket): HostedPageTextStorage {
  return {
    async getText(key) {
      const object = await bucket.get(key);
      return object ? object.text() : null;
    },
    async putText(key, value, options) {
      await bucket.put(key, value, toR2PutOptions(options));
    },
    async putTextIfAbsent(key, value, options) {
      const precondition = new Headers();
      precondition.set("If-None-Match", "*");
      const object = await bucket.put(key, value, {
        ...toR2PutOptions(options),
        onlyIf: precondition
      });

      return object !== null;
    }
  };
}

function toR2PutOptions(options: HostedPagePutOptions | undefined) {
  return {
    httpMetadata: {
      contentType: options?.contentType,
      cacheControl: options?.cacheControl
    },
    customMetadata: options?.metadata
  };
}
