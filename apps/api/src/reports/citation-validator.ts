import type { CyberCase } from "../schemas/case.schema";
import type { ReportCitation } from "../schemas/reports.schema";

export interface CitationValidationResult {
  passed: boolean;
  warnings: string[];
  missingFindingIds: string[];
  invalidCitationIds: string[];
}

function knownEvidenceRefs(cyberCase: CyberCase): Set<string> {
  const refs = new Set<string>(["case:summary", "case:report"]);

  cyberCase.result?.evidence.forEach((_item, index) => refs.add(`evidence:${index + 1}`));
  cyberCase.result?.timeline.forEach((_item, index) => refs.add(`timeline:${index + 1}`));
  cyberCase.result?.knowledge?.results.forEach((result) => refs.add(`knowledge:${result.chunkId}`));
  cyberCase.result?.ingestion?.normalizedEvents.forEach((event) => {
    refs.add(`event:${event.id}`);
    refs.add(event.rawRef.lineNumber ? `${event.rawRef.artifactId}:line:${event.rawRef.lineNumber}` : event.rawRef.artifactId);
  });
  cyberCase.result?.reasoning?.observations.forEach((observation) => {
    refs.add(`observation:${observation.id}`);
    refs.add(observation.sourceRef.id);
    refs.add(observation.sourceRef.locator);
  });
  cyberCase.result?.reasoning?.findings.forEach((finding) => refs.add(`finding:${finding.id}`));

  return refs;
}

export function validateReportCitations(cyberCase: CyberCase, citations: ReportCitation[]): CitationValidationResult {
  const observationIds = new Set(cyberCase.result?.reasoning?.observations.map((observation) => observation.id) ?? []);
  const findingIds = new Set(cyberCase.result?.reasoning?.findings.map((finding) => finding.id) ?? []);
  const refs = knownEvidenceRefs(cyberCase);
  const warnings: string[] = [];
  const invalidCitationIds: string[] = [];

  for (const citation of citations) {
    if (citation.observationId && !observationIds.has(citation.observationId)) {
      warnings.push(`Citation ${citation.id} references unknown observation ${citation.observationId}.`);
      invalidCitationIds.push(citation.id);
    }
    if (citation.findingId && !findingIds.has(citation.findingId)) {
      warnings.push(`Citation ${citation.id} references unknown finding ${citation.findingId}.`);
      invalidCitationIds.push(citation.id);
    }
    if (!refs.has(citation.sourceRef)) {
      warnings.push(`Citation ${citation.id} references unknown source ${citation.sourceRef}.`);
      invalidCitationIds.push(citation.id);
    }
  }

  const missingFindingIds = [...findingIds].filter(
    (findingId) => !citations.some((citation) => citation.findingId === findingId)
  );
  for (const findingId of missingFindingIds) {
    warnings.push(`Finding ${findingId} has no report citation.`);
  }

  return {
    passed: warnings.length === 0,
    warnings,
    missingFindingIds,
    invalidCitationIds: [...new Set(invalidCitationIds)]
  };
}
