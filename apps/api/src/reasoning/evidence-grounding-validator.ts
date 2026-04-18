import type { AnalysisResult } from "../schemas/result.schema";
import type { GroundingFinding, GroundingStatus } from "../schemas/model-quality.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

const weakActionPrefixes = ["collect", "review", "preserve", "validate", "document", "search", "confirm", "verify"];
const stopWords = new Set([
  "the",
  "and",
  "or",
  "for",
  "with",
  "that",
  "this",
  "was",
  "were",
  "from",
  "into",
  "across",
  "relevant",
  "additional",
  "defensive",
  "security"
]);

function tokens(text: string): string[] {
  return [
    ...new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9_.-]+/g, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 4 && !stopWords.has(token))
    )
  ];
}

function evidenceSupport(claim: string, evidence: string[]): { status: GroundingStatus; evidenceRefs: string[]; reason: string } {
  if (evidence.length === 0) {
    return {
      status: "unsupported",
      evidenceRefs: [],
      reason: "No evidence is available to support this claim."
    };
  }

  const claimTokens = tokens(claim);
  const matches = evidence
    .map((item, index) => {
      const evidenceTokens = new Set(tokens(item));
      const overlap = claimTokens.filter((token) => evidenceTokens.has(token));
      return {
        ref: `evidence:${index + 1}`,
        overlap
      };
    })
    .filter((item) => item.overlap.length > 0);

  if (matches.length > 0) {
    return {
      status: matches.some((item) => item.overlap.length >= 2) ? "supported" : "weak",
      evidenceRefs: matches.map((item) => item.ref),
      reason:
        matches.some((item) => item.overlap.length >= 2)
          ? "Claim shares multiple material terms with case evidence."
          : "Claim has limited direct evidence overlap and should be reviewed."
    };
  }

  if (weakActionPrefixes.some((prefix) => claim.toLowerCase().startsWith(prefix))) {
    return {
      status: "weak",
      evidenceRefs: evidence.map((_, index) => `evidence:${index + 1}`).slice(0, 2),
      reason: "Recommendation is a defensive follow-up action, but it is not directly cited to a specific evidence sentence."
    };
  }

  return {
    status: "unsupported",
    evidenceRefs: [],
    reason: "No material evidence terms support this claim."
  };
}

function makeFinding(input: {
  caseId?: string;
  claimType: GroundingFinding["claimType"];
  claim: string;
  support: { status: GroundingStatus; evidenceRefs: string[]; reason: string };
}): GroundingFinding {
  return {
    id: createId("grounding"),
    caseId: input.caseId,
    claimType: input.claimType,
    claim: input.claim,
    status: input.support.status,
    evidenceRefs: input.support.evidenceRefs,
    reason: input.support.reason,
    analystReviewRequired: input.support.status !== "supported",
    createdAt: nowIso()
  };
}

export function validateEvidenceGrounding(input: { caseId?: string; result: AnalysisResult }): GroundingFinding[] {
  const findings: GroundingFinding[] = [];
  const evidence = input.result.evidence;

  findings.push(
    makeFinding({
      caseId: input.caseId,
      claimType: "summary",
      claim: input.result.summary,
      support: evidenceSupport(input.result.summary, evidence)
    })
  );

  if (input.result.severity === "high" || input.result.severity === "critical") {
    findings.push(
      makeFinding({
        caseId: input.caseId,
        claimType: "severity",
        claim: `${input.result.severity} severity: ${input.result.title}`,
        support: evidenceSupport(`${input.result.title} ${input.result.category}`, evidence)
      })
    );
  }

  for (const recommendation of input.result.recommendedActions) {
    findings.push(
      makeFinding({
        caseId: input.caseId,
        claimType: "recommendation",
        claim: recommendation,
        support: evidenceSupport(recommendation, evidence)
      })
    );
  }

  for (const finding of input.result.reasoning?.findings ?? []) {
    findings.push(
      makeFinding({
        caseId: input.caseId,
        claimType: "finding",
        claim: `${finding.title}: ${finding.reasoningSummary}`,
        support: evidenceSupport(`${finding.title} ${finding.reasoningSummary}`, evidence)
      })
    );
  }

  return findings;
}
