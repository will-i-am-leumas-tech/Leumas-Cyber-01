import { riskScoreV2Schema, type AssetExposureV2, type RiskFactor, type RiskScoreV2, type VulnerabilityEnrichment } from "../schemas/vulnerabilities-v2.schema";
import type { VulnerabilityFinding, VulnerabilityPriority } from "../schemas/vulnerabilities.schema";
import { nowIso } from "../utils/time";
import { priorityFromScore } from "./risk-scoring-service";

const severityBase: Record<VulnerabilityFinding["severity"], number> = {
  low: 15,
  medium: 35,
  high: 65,
  critical: 80
};

const criticalityImpact: Record<VulnerabilityPriority, number> = {
  low: 0,
  medium: 5,
  high: 10,
  critical: 15
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function factor(name: string, impact: number, explanation: string): RiskFactor {
  return {
    name,
    impact,
    explanation
  };
}

export function scoreRiskV2(input: {
  finding: VulnerabilityFinding;
  enrichment?: VulnerabilityEnrichment;
  exposure?: AssetExposureV2;
}): RiskScoreV2 {
  const factors: RiskFactor[] = [
    factor("scanner_severity", severityBase[input.finding.severity], `${input.finding.severity} scanner severity.`)
  ];

  if (input.exposure?.internetExposure) {
    factors.push(factor("internet_exposure", 15, "Asset has an internet-facing exposure path."));
  }
  if (input.exposure) {
    factors.push(
      factor(
        "business_criticality",
        criticalityImpact[input.exposure.businessCriticality],
        `${input.exposure.businessCriticality} business criticality.`
      )
    );
  }
  if (input.enrichment?.kev) {
    factors.push(factor("known_exploited", 15, "Known exploited signal is present. Use defensive mitigation guidance only."));
  }
  if ((input.enrichment?.epss ?? 0) >= 0.7) {
    factors.push(factor("epss_high", 10, `EPSS is ${Math.round((input.enrichment?.epss ?? 0) * 100)}%.`));
  } else if ((input.enrichment?.epss ?? 0) >= 0.3) {
    factors.push(factor("epss_medium", 5, `EPSS is ${Math.round((input.enrichment?.epss ?? 0) * 100)}%.`));
  }
  const controlReduction = Math.min((input.exposure?.controlCoverage.length ?? 0) * 4, 12);
  if (controlReduction > 0) {
    factors.push(factor("control_coverage", -controlReduction, "Compensating controls reduce urgency but do not remove remediation need."));
  }
  const score = clamp(factors.reduce((sum, item) => sum + item.impact, 0));
  const staleDataWarnings =
    input.enrichment?.lastModifiedAt && input.enrichment.lastModifiedAt < "2026-01-01T00:00:00.000Z"
      ? ["Advisory enrichment is older than 2026-01-01; refresh advisory data before final prioritization."]
      : [];

  return riskScoreV2Schema.parse({
    findingId: input.finding.id,
    score,
    priority: priorityFromScore(score),
    factors,
    explanation: factors.map((item) => item.explanation).join(" "),
    staleDataWarnings,
    createdAt: nowIso()
  });
}
