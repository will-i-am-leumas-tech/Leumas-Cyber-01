import type { VulnerabilityEnrichment } from "../schemas/vulnerabilities-v2.schema";

export type AdvisoryRecord = Omit<VulnerabilityEnrichment, "findingId" | "createdAt">;

const advisoryRecords: AdvisoryRecord[] = [
  {
    cve: "CVE-2026-1001",
    cwe: ["CWE-787"],
    cvss: 9.8,
    epss: 0.91,
    kev: true,
    advisoryRefs: ["vendor:advisory:CVE-2026-1001", "cisa:kev:CVE-2026-1001"],
    patchRefs: ["vendor:patch:1.2.4"],
    mitigationRefs: ["restrict exposed service", "apply WAF virtual patch until maintenance window"],
    publishedAt: "2026-04-01T00:00:00.000Z",
    lastModifiedAt: "2026-04-16T00:00:00.000Z",
    source: "local-fixture"
  },
  {
    cve: "CVE-2025-2002",
    cwe: ["CWE-79"],
    cvss: 5.4,
    epss: 0.08,
    kev: false,
    advisoryRefs: ["vendor:advisory:CVE-2025-2002"],
    patchRefs: ["vendor:patch:4.5.7"],
    mitigationRefs: ["update affected library"],
    publishedAt: "2025-09-18T00:00:00.000Z",
    lastModifiedAt: "2026-01-12T00:00:00.000Z",
    source: "local-fixture"
  }
];

export function getAdvisoryRecord(cve: string): AdvisoryRecord | undefined {
  return advisoryRecords.find((record) => record.cve.toLowerCase() === cve.toLowerCase());
}

export function listAdvisorySources(): AdvisoryRecord[] {
  return advisoryRecords.map((record) => ({
    ...record,
    cwe: [...record.cwe],
    advisoryRefs: [...record.advisoryRefs],
    patchRefs: [...record.patchRefs],
    mitigationRefs: [...record.mitigationRefs]
  }));
}
