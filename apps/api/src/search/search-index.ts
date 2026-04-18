import type { CaseListItem, CyberCase } from "../schemas/case.schema";

export interface CaseSearchDocument {
  caseId: string;
  title: string;
  summary: string;
  text: string;
}

export function buildCaseSearchDocument(cyberCase: CyberCase | CaseListItem): CaseSearchDocument {
  const fullCase = cyberCase as CyberCase;
  const indicators = fullCase.result?.indicators.map((indicator) => indicator.normalized).join(" ") ?? "";
  const entities = fullCase.result?.ingestion?.entities.map((entity) => entity.normalized).join(" ") ?? "";
  const ingestedEvidence =
    fullCase.evidenceRecords
      ?.map((record) =>
        [
          record.sourceName,
          record.sourceType,
          record.eventType,
          record.normalizedEvent.actor,
          record.normalizedEvent.asset,
          record.normalizedEvent.network.srcIp,
          record.normalizedEvent.network.dstIp,
          record.normalizedEvent.rawRef.excerpt
        ]
          .filter(Boolean)
          .join(" ")
      )
      .join(" ") ?? "";
  return {
    caseId: cyberCase.id,
    title: cyberCase.title,
    summary: cyberCase.summary,
    text: [cyberCase.title, cyberCase.summary, cyberCase.severity, cyberCase.mode, indicators, entities, ingestedEvidence]
      .join(" ")
      .toLowerCase()
  };
}

export function searchCaseList(cases: CaseListItem[], query: string): CaseListItem[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
  if (terms.length === 0) {
    return cases;
  }

  return cases.filter((cyberCase) => {
    const document = buildCaseSearchDocument(cyberCase);
    return terms.every((term) => document.text.includes(term));
  });
}

export function searchCases(cases: CyberCase[], query: string): CyberCase[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
  if (terms.length === 0) {
    return cases;
  }

  return cases.filter((cyberCase) => {
    const document = buildCaseSearchDocument(cyberCase);
    return terms.every((term) => document.text.includes(term));
  });
}
