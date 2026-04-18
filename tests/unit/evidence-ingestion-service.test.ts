import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { EvidenceSourceRegistry } from "../../apps/api/src/ingestion/evidence-source-registry";
import { IngestionJobService } from "../../apps/api/src/ingestion/ingestion-job-service";
import { listIngestionParserIds } from "../../apps/api/src/ingestion/ingestion-worker";

describe("evidence ingestion services", () => {
  it("registers evidence sources with parser defaults and reliability scoring", () => {
    const registry = new EvidenceSourceRegistry();
    const source = registry.register({
      name: "SOC DNS fixture",
      type: "dns",
      owner: "soc",
      retentionClass: "standard",
      dataClass: "internal"
    });

    expect(source.parserId).toBe("dns-parser");
    expect(source.reliabilityScore).toBeGreaterThan(0.7);
    expect(registry.list()).toHaveLength(1);
    expect(listIngestionParserIds()).toEqual(expect.arrayContaining(["dns-parser", "proxy-parser", "email_security-parser"]));
  });

  it("normalizes DNS evidence, records duplicate fingerprints, and emits custody metadata", async () => {
    const registry = new EvidenceSourceRegistry();
    const source = registry.register({
      name: "SOC DNS fixture",
      type: "dns",
      owner: "soc",
      retentionClass: "standard",
      dataClass: "internal"
    });
    const service = new IngestionJobService(registry);
    const dnsText = await readFile("data/fixtures/ingestion/dns-events.log", "utf8");

    const result = service.startJob({
      sourceId: source.id,
      actor: "analyst@example.test",
      text: dnsText
    });

    expect(result?.job.status).toBe("completed");
    expect(result?.evidenceRecords).toHaveLength(3);
    expect(result?.evidenceRecords.some((record) => record.duplicate)).toBe(true);
    expect(result?.deduplicationRecords.some((record) => record.duplicateCount === 1)).toBe(true);
    expect(result?.custodyEntries.map((entry) => entry.operation)).toEqual(
      expect.arrayContaining(["retrieved", "parsed", "deduplicated", "classified"])
    );
  });
});
