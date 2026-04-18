import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { AuditEvent } from "../../apps/api/src/schemas/audit.schema";
import { hashAuditEvent, verifyAuditChain } from "../../apps/api/src/audit/integrity-service";

function parseJsonLines(raw: string): unknown[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown);
}

describe("audit integrity service", () => {
  it("changes the hash when audit event content changes", async () => {
    const [event] = parseJsonLines(await readFile("data/fixtures/audit/valid-chain.jsonl", "utf8")) as AuditEvent[];
    const { hash: _hash, ...withoutHash } = event;
    const changed = {
      ...withoutHash,
      summary: "Modified summary"
    };

    expect(hashAuditEvent(withoutHash)).toBe(event.hash);
    expect(hashAuditEvent(changed)).not.toBe(event.hash);
  });

  it("verifies valid chains and detects modified fixture events", async () => {
    const valid = parseJsonLines(await readFile("data/fixtures/audit/valid-chain.jsonl", "utf8"));
    const tampered = parseJsonLines(await readFile("data/fixtures/audit/tampered-chain.jsonl", "utf8"));

    expect(verifyAuditChain(valid)).toMatchObject({
      verified: true,
      checkedEvents: 2,
      failures: []
    });
    expect(verifyAuditChain(tampered)).toMatchObject({
      verified: false,
      checkedEvents: 2
    });
    expect(verifyAuditChain(tampered).failures.join(" ")).toMatch(/content hash mismatch/);
  });
});
