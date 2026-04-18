import type { AnalysisResult } from "../schemas/result.schema";
import { normalizeIndicators } from "../utils/indicators";

export function analyzeIocs(text: string): Omit<AnalysisResult, "reportMarkdown"> {
  const indicators = normalizeIndicators(text);
  const typeCounts = indicators.reduce<Record<string, number>>((counts, indicator) => {
    counts[indicator.type] = (counts[indicator.type] ?? 0) + 1;
    return counts;
  }, {});

  const evidence = Object.entries(typeCounts).map(([type, count]) => `${count} ${type} indicator${count === 1 ? "" : "s"} extracted`);

  return {
    title: "IOC Batch Review",
    severity: indicators.length > 0 ? "medium" : "low",
    confidence: indicators.length > 0 ? 0.88 : 0.55,
    category: "indicator-review",
    summary:
      indicators.length > 0
        ? `Normalized ${indicators.length} unique indicator${indicators.length === 1 ? "" : "s"} for defensive review.`
        : "No clear indicators were identified in the submitted input.",
    evidence,
    recommendedActions: [
      "Validate indicators against internal telemetry before blocking business-critical assets.",
      "Search endpoint, DNS, proxy, firewall, and identity logs for recent sightings.",
      "Add confirmed malicious indicators to blocklists or watchlists with an expiration date.",
      "Document source, first seen time, and any affected assets in the case notes."
    ],
    indicators,
    timeline: [],
    notes: ["No external enrichment was performed by the MVP local adapter."]
  };
}
