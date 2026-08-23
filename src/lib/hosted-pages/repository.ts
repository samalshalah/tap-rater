import { createHostedPageCode, isValidHostedPageCode } from "./codes";
import {
  hostedPageAssignmentKey,
  hostedPageCurrentKey,
  hostedPageProductAssignmentKey,
  hostedPageVersionKey,
  validateHostedPageSnapshot,
  type HostedPageAssignment,
  type HostedPageCurrentPointer,
  type HostedPageSnapshot
} from "./snapshots";

export type HostedPageTextStorage = {
  getText: (key: string) => Promise<string | null>;
  putText: (key: string, value: string, options?: HostedPagePutOptions) => Promise<void>;
  putTextIfAbsent: (key: string, value: string, options?: HostedPagePutOptions) => Promise<boolean>;
};

export type HostedPagePutOptions = {
  contentType?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
};

export type HostedPageAssignmentInput = {
  physicalProductRef: string;
  assignedBy?: string;
  code?: string;
  now?: Date;
  generateCode?: () => string;
};

export async function assignPermanentHostedPageCode(storage: HostedPageTextStorage, input: HostedPageAssignmentInput): Promise<HostedPageAssignment> {
  const existingProductAssignment = await readJson<HostedPageAssignment>(storage, hostedPageProductAssignmentKey(input.physicalProductRef));
  if (existingProductAssignment) {
    return existingProductAssignment;
  }

  const generateCode = input.generateCode ?? createHostedPageCode;
  const maxAttempts = input.code ? 1 : 10;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = input.code ?? generateCode();
    if (!isValidHostedPageCode(code)) {
      throw new HostedPageRepositoryError("Generated hosted page code is invalid.");
    }

    const assignment: HostedPageAssignment = {
      code,
      physicalProductRef: input.physicalProductRef,
      assignedAt: (input.now ?? new Date()).toISOString(),
      assignedBy: input.assignedBy
    };

    const created = await storage.putTextIfAbsent(hostedPageAssignmentKey(code), JSON.stringify(assignment, null, 2), jsonWriteOptions("immutable"));
    if (!created) {
      const existingCodeAssignment = await readJson<HostedPageAssignment>(storage, hostedPageAssignmentKey(code));
      if (existingCodeAssignment?.physicalProductRef === input.physicalProductRef) {
        return existingCodeAssignment;
      }
      if (input.code) {
        throw new HostedPageRepositoryError("Hosted page code is already assigned and cannot be reassigned.");
      }
      continue;
    }

    const indexed = await storage.putTextIfAbsent(
      hostedPageProductAssignmentKey(input.physicalProductRef),
      JSON.stringify(assignment, null, 2),
      jsonWriteOptions("immutable")
    );

    if (indexed) {
      return assignment;
    }

    const winningAssignment = await readJson<HostedPageAssignment>(storage, hostedPageProductAssignmentKey(input.physicalProductRef));
    if (winningAssignment) {
      return winningAssignment;
    }

    throw new HostedPageRepositoryError("Hosted page code was assigned but product index could not be confirmed.");
  }

  throw new HostedPageRepositoryError("Could not allocate a unique hosted page code.");
}

export async function publishHostedPageSnapshot(storage: HostedPageTextStorage, snapshot: HostedPageSnapshot): Promise<HostedPageCurrentPointer> {
  const normalized = validateHostedPageSnapshot(snapshot);
  const assignment = await readJson<HostedPageAssignment>(storage, hostedPageAssignmentKey(normalized.code));

  if (!assignment) {
    throw new HostedPageRepositoryError("Hosted page code must be permanently assigned before publishing.");
  }

  const versionCreated = await storage.putTextIfAbsent(
    hostedPageVersionKey(normalized.code, normalized.version),
    JSON.stringify(normalized, null, 2),
    jsonWriteOptions("versioned")
  );

  if (!versionCreated) {
    throw new HostedPageRepositoryError("Hosted page snapshot version already exists.");
  }

  const pointer: HostedPageCurrentPointer = {
    code: normalized.code,
    currentVersion: normalized.version,
    updatedAt: new Date().toISOString()
  };

  await storage.putText(hostedPageCurrentKey(normalized.code), JSON.stringify(pointer, null, 2), jsonWriteOptions("current"));
  return pointer;
}

export async function rollbackHostedPageSnapshot(storage: HostedPageTextStorage, code: string, version: string): Promise<HostedPageCurrentPointer> {
  const snapshot = await readJson<HostedPageSnapshot>(storage, hostedPageVersionKey(code, version));
  if (!snapshot) {
    throw new HostedPageRepositoryError("Hosted page snapshot version does not exist.");
  }

  const normalized = validateHostedPageSnapshot(snapshot);
  const pointer: HostedPageCurrentPointer = {
    code: normalized.code,
    currentVersion: normalized.version,
    updatedAt: new Date().toISOString()
  };

  await storage.putText(hostedPageCurrentKey(normalized.code), JSON.stringify(pointer, null, 2), jsonWriteOptions("current"));
  return pointer;
}

export async function readCurrentHostedPageSnapshot(storage: HostedPageTextStorage, code: string): Promise<HostedPageSnapshot | null> {
  const pointer = await readJson<HostedPageCurrentPointer>(storage, hostedPageCurrentKey(code));
  if (!pointer || pointer.code !== code) {
    return null;
  }

  const snapshot = await readJson<HostedPageSnapshot>(storage, hostedPageVersionKey(code, pointer.currentVersion));
  return snapshot ? validateHostedPageSnapshot(snapshot) : null;
}

export async function readHostedPageAssignment(storage: HostedPageTextStorage, code: string): Promise<HostedPageAssignment | null> {
  return readJson<HostedPageAssignment>(storage, hostedPageAssignmentKey(code));
}

export class HostedPageRepositoryError extends Error {}

async function readJson<T>(storage: HostedPageTextStorage, key: string): Promise<T | null> {
  const value = await storage.getText(key);
  if (!value) return null;

  return JSON.parse(value) as T;
}

function jsonWriteOptions(kind: "immutable" | "versioned" | "current"): HostedPagePutOptions {
  if (kind === "current") {
    return {
      contentType: "application/json; charset=utf-8",
      cacheControl: "no-store",
      metadata: { hostedPageObject: kind }
    };
  }

  return {
    contentType: "application/json; charset=utf-8",
    cacheControl: "public, max-age=31536000, immutable",
    metadata: { hostedPageObject: kind }
  };
}
