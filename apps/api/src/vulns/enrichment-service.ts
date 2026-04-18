import {
  vulnerabilityEnrichmentSchema,
  type VulnerabilityEnrichment
} from "../schemas/vulnerabilities-v2.schema";
import type { VulnerabilityContext, VulnerabilityFinding } from "../schemas/vulnerabilities.schema";
import { nowIso } from "../utils/time";
import { getAdvisoryRecord } from "./advisory-source-registry";

export function enrichVulnerability(input: {
  finding: VulnerabilityFinding;
  context?: VulnerabilityContext;
}): VulnerabilityEnrichment {
  const advisory = getAdvisoryRecord(input.finding.cve);

  return vulnerabilityEnrichmentSchema.parse({
    findingId: input.finding.id,
    cve: input.finding.cve,
    cwe: advisory?.cwe ?? [],
    cvss: advisory?.cvss ?? input.context?.cvss,
    epss: advisory?.epss ?? input.context?.epss ?? 0,
    kev: advisory?.kev ?? input.context?.kev ?? false,
    advisoryRefs: advisory?.advisoryRefs ?? [input.context?.vendorAdvisory].filter(Boolean),
    patchRefs: advisory?.patchRefs ?? [],
    mitigationRefs: advisory?.mitigationRefs ?? [],
    publishedAt: advisory?.publishedAt,
    lastModifiedAt: advisory?.lastModifiedAt,
    source: advisory?.source ?? "scanner-context",
    createdAt: nowIso()
  });
}
