import type { AnalysisResult } from "../schemas/result.schema";
import type { KnowledgeContext, RetrievalResult } from "../schemas/knowledge.schema";
import type { CitationQuality } from "../schemas/knowledge-v2.schema";

type AnalysisWithoutReport = Omit<AnalysisResult, "reportMarkdown" | "reasoning">;

function actionLinesFromResult(result: RetrievalResult): string[] {
  return result.excerpt
    .split(/\s+-\s+|\n-\s+/)
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter((line) => line.length > 20)
    .slice(0, 2);
}

export function applyKnowledgeContext(
  result: AnalysisWithoutReport,
  knowledge: KnowledgeContext | undefined
): AnalysisWithoutReport {
  if (!knowledge || knowledge.results.length === 0) {
    return result;
  }

  const citations = knowledge.results.map(
    (retrievalResult) => {
      const quality = retrievalResult.citationQuality as CitationQuality | undefined;
      const qualityStatus = quality
        ? `quality relevance=${quality.relevance.toFixed(2)} freshness=${quality.freshness.toFixed(2)} trust=${quality.trust.toFixed(2)}`
        : "quality not scored";
      return `Knowledge source "${retrievalResult.citation.title}" ${retrievalResult.citation.version} at ${retrievalResult.citation.location} (${qualityStatus})`;
    }
  );
  const recommendedActions = [...result.recommendedActions];

  if (result.category === "hardening") {
    for (const retrievalResult of knowledge.results) {
      for (const action of actionLinesFromResult(retrievalResult)) {
        const citedAction = `${action} (source: ${retrievalResult.citation.title}, ${retrievalResult.citation.location})`;
        if (!recommendedActions.includes(citedAction)) {
          recommendedActions.push(citedAction);
        }
      }
    }
  }

  return {
    ...result,
    evidence: [...result.evidence, ...citations],
    recommendedActions,
    knowledge,
    notes: [
      ...result.notes,
      `Retrieved ${knowledge.results.length} knowledge source chunk${knowledge.results.length === 1 ? "" : "s"} for source-grounded guidance.`,
      ...knowledge.warnings
    ]
  };
}
