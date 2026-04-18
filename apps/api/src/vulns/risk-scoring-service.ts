import type {
  AssetRiskProfile,
  ScannerFindingInput,
  VulnerabilityContext,
  VulnerabilityFinding,
  VulnerabilityPriority
} from "../schemas/vulnerabilities.schema";

const severityBase: Record<ScannerFindingInput["severity"], number> = {
  low: 20,
  medium: 40,
  high: 70,
  critical: 85
};

const criticalityBoost: Record<VulnerabilityPriority, number> = {
  low: 0,
  medium: 5,
  high: 10,
  critical: 15
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function priorityFromScore(score: number): VulnerabilityPriority {
  if (score >= 90) {
    return "critical";
  }
  if (score >= 70) {
    return "high";
  }
  if (score >= 40) {
    return "medium";
  }
  return "low";
}

export function scoreVulnerability(input: ScannerFindingInput, asset?: AssetRiskProfile): {
  riskScore: number;
  priority: VulnerabilityPriority;
  riskSummary: string;
} {
  const exposureBoost = input.exposure === "internet" || asset?.internetExposure ? 15 : input.exposure === "internal" ? 5 : 0;
  const kevBoost = input.kev ? 15 : 0;
  const epssBoost = input.epss >= 0.7 ? 10 : input.epss >= 0.3 ? 5 : 0;
  const maturityBoost = input.exploitMaturity === "active" ? 10 : input.exploitMaturity === "poc" ? 5 : 0;
  const controlReduction = Math.min((asset?.compensatingControls.length ?? 0) * 3, 9);
  const score = clampScore(
    severityBase[input.severity] +
      exposureBoost +
      kevBoost +
      epssBoost +
      maturityBoost +
      criticalityBoost[asset?.businessCriticality ?? "medium"] -
      controlReduction
  );
  const priority = priorityFromScore(score);
  const riskSummary = [
    `${input.severity} scanner severity`,
    input.exposure === "internet" || asset?.internetExposure ? "internet-exposed asset" : `${input.exposure} exposure`,
    asset ? `${asset.businessCriticality} business criticality` : "default asset criticality",
    input.kev ? "known exploited signal present" : "no known exploited signal",
    `EPSS ${Math.round(input.epss * 100)}%`
  ].join("; ");

  return {
    riskScore: score,
    priority,
    riskSummary
  };
}

export function sortFindingsByPriority(findings: VulnerabilityFinding[]): VulnerabilityFinding[] {
  return [...findings].sort((a, b) => b.riskScore - a.riskScore || a.assetName.localeCompare(b.assetName));
}

export function contextForFinding(findingId: string, input: ScannerFindingInput): VulnerabilityContext {
  return {
    findingId,
    epss: input.epss,
    kev: input.kev,
    cvss: input.cvss,
    vendorAdvisory: input.vendorAdvisory,
    exposure: input.exposure,
    exploitMaturity: input.exploitMaturity,
    exploitMaturitySummary: input.exploitMaturitySummary
  };
}
