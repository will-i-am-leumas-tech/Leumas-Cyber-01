import type { Finding, Observation } from "../schemas/reasoning.schema";

export interface EvidenceSupportScore {
  findingId: string;
  evidenceObservationIds: string[];
  evidenceCoverage: number;
  status: "supported" | "weak" | "unsupported";
  reason: string;
}

export function scoreFindingEvidence(findings: Finding[], observations: Observation[]): EvidenceSupportScore[] {
  const observationIds = new Set(observations.map((observation) => observation.id));
  return findings.map((finding) => {
    const validEvidenceIds = finding.evidenceObservationIds.filter((id) => observationIds.has(id));
    const evidenceCoverage = finding.evidenceObservationIds.length === 0 ? 0 : validEvidenceIds.length / finding.evidenceObservationIds.length;
    const status = validEvidenceIds.length === 0 ? "unsupported" : evidenceCoverage < 1 || validEvidenceIds.length < 2 ? "weak" : "supported";

    return {
      findingId: finding.id,
      evidenceObservationIds: validEvidenceIds,
      evidenceCoverage,
      status,
      reason:
        status === "supported"
          ? "Finding cites multiple valid observations."
          : status === "weak"
            ? "Finding cites limited or partially valid evidence."
            : "Finding does not cite valid observations."
    };
  });
}
