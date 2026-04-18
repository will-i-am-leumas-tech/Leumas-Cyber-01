import type { AuditEvent } from "../schemas/audit.schema";
import { auditEventSchema } from "../schemas/audit.schema";
import { sha256Text } from "../reasoning/hash";

export const auditGenesisHash = "GENESIS";

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashAuditEvent(event: Omit<AuditEvent, "hash">): string {
  return sha256Text(stableStringify(event));
}

export interface AuditChainVerification {
  verified: boolean;
  checkedEvents: number;
  failures: string[];
}

export function verifyAuditChain(rawEvents: unknown[]): AuditChainVerification {
  const failures: string[] = [];
  let previousHash = auditGenesisHash;

  rawEvents.forEach((rawEvent, index) => {
    const parsed = auditEventSchema.safeParse(rawEvent);
    if (!parsed.success) {
      failures.push(`event ${index + 1} failed schema validation`);
      return;
    }

    const event = parsed.data;
    if (event.sequence !== index + 1) {
      failures.push(`event ${event.id} has sequence ${event.sequence}, expected ${index + 1}`);
    }
    if (event.previousHash !== previousHash) {
      failures.push(`event ${event.id} previous hash mismatch`);
    }

    const { hash: _hash, ...withoutHash } = event;
    const expectedHash = hashAuditEvent(withoutHash);
    if (event.hash !== expectedHash) {
      failures.push(`event ${event.id} content hash mismatch`);
    }

    previousHash = event.hash;
  });

  return {
    verified: failures.length === 0,
    checkedEvents: rawEvents.length,
    failures
  };
}
