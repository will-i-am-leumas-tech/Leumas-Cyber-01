import type { AnalysisResult, Indicator, TimelineEvent } from "../schemas/result.schema";
import type { KnowledgeContext } from "../schemas/knowledge.schema";
import type { IngestionBundle } from "../schemas/ingest.schema";
import type { Finding, Hypothesis, Observation, ReasoningBundle } from "../schemas/reasoning.schema";
import type { ReportTemplate } from "../schemas/reports.schema";
import { getReportTemplate } from "../reports/template-registry";

function bulletList(items: string[]): string {
  if (items.length === 0) {
    return "- None identified";
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function indicatorTable(indicators: Indicator[]): string {
  if (indicators.length === 0) {
    return "No indicators were extracted.";
  }

  const rows = indicators.map((indicator) => `| ${indicator.type} | \`${indicator.normalized}\` |`);
  return ["| Type | Indicator |", "| --- | --- |", ...rows].join("\n");
}

function timelineTable(timeline: TimelineEvent[]): string {
  if (timeline.length === 0) {
    return "No timestamped events were extracted.";
  }

  const rows = timeline.map((event) => `| ${event.timestamp} | ${event.label.replace(/\|/g, "\\|")} |`);
  return ["| Time | Event |", "| --- | --- |", ...rows].join("\n");
}

function observationList(observations: Observation[]): string {
  const facts = observations.filter((observation) => observation.type === "fact" || observation.type === "timeline_event");
  if (facts.length === 0) {
    return "- No source-linked facts were generated.";
  }

  return facts
    .map((observation) => {
      const confidence = Math.round(observation.confidence * 100);
      return `- ${observation.value} (${confidence}% confidence, ${observation.sourceRef.locator})`;
    })
    .join("\n");
}

function findingList(findings: Finding[]): string {
  if (findings.length === 0) {
    return "- No structured findings were generated.";
  }

  return findings
    .map((finding) => {
      const confidence = Math.round(finding.confidence * 100);
      const evidence = finding.evidenceObservationIds.length > 0 ? finding.evidenceObservationIds.join(", ") : "no linked evidence";
      return `- **${finding.title}**: ${finding.reasoningSummary} (${confidence}% confidence; evidence: ${evidence})`;
    })
    .join("\n");
}

function hypothesisList(hypotheses: Hypothesis[]): string {
  if (hypotheses.length === 0) {
    return "- No hypotheses were generated.";
  }

  return hypotheses
    .map((hypothesis) => `- **${hypothesis.title}** [${hypothesis.status}]: ${hypothesis.reasoningSummary}`)
    .join("\n");
}

function reasoningSection(reasoning?: ReasoningBundle): string {
  if (!reasoning) {
    return [
      "## Evidence Reasoning",
      "No structured reasoning bundle was generated.",
      "",
      "## Assumptions And Unknowns",
      "- Assumptions: Not recorded",
      "- Unknowns: Not recorded"
    ].join("\n");
  }

  return [
    "## Evidence Reasoning",
    "",
    "### Findings",
    findingList(reasoning.findings),
    "",
    "### Source-Linked Facts",
    observationList(reasoning.observations),
    "",
    "### Hypotheses",
    hypothesisList(reasoning.hypotheses),
    "",
    "## Assumptions And Unknowns",
    "",
    "### Assumptions",
    bulletList(reasoning.assumptions),
    "",
    "### Unknowns",
    bulletList(reasoning.unknowns)
  ].join("\n");
}

function knowledgeSection(knowledge?: KnowledgeContext): string {
  if (!knowledge || knowledge.results.length === 0) {
    return ["## Knowledge Sources", "No knowledge sources were cited."].join("\n");
  }

  const rows = knowledge.results.map((result) => {
    const stale = result.citation.stale ? "stale" : "current";
    return `| ${result.citation.title} | ${result.citation.location} | ${result.citation.trustTier} | ${result.citation.version} | ${stale} |`;
  });

  const warnings = knowledge.warnings.length > 0 ? ["", "### Source Warnings", bulletList(knowledge.warnings)] : [];

  return [
    "## Knowledge Sources",
    `Retrieval query: ${knowledge.query}`,
    "",
    "| Source | Location | Trust | Version | Review |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
    ...warnings
  ].join("\n");
}

function ingestionSection(ingestion?: IngestionBundle): string {
  if (!ingestion) {
    return ["## Normalized Events", "No ingestion bundle was generated."].join("\n");
  }

  const warnings =
    ingestion.parserWarnings.length > 0
      ? ["", "### Parser Warnings", bulletList(ingestion.parserWarnings.map((warning) => `${warning.parserId}: ${warning.message}`))]
      : [];

  return [
    "## Normalized Events",
    `Artifacts: ${ingestion.artifacts.length}. Events: ${ingestion.normalizedEvents.length}. Entities: ${ingestion.entities.length}.`,
    ...warnings
  ].join("\n");
}

function sectionContentById(result: Omit<AnalysisResult, "reportMarkdown">): Record<string, string> {
  const severity = `**${result.severity.toUpperCase()}** with ${Math.round(result.confidence * 100)}% confidence.`;

  return {
    overview: result.summary,
    severity,
    findings: bulletList(result.evidence),
    "key-findings": findingList(result.reasoning?.findings ?? []),
    "evidence-reasoning": reasoningSection(result.reasoning).replace(/^## Evidence Reasoning\n\n?/, ""),
    "knowledge-sources": knowledgeSection(result.knowledge).replace(/^## Knowledge Sources\n\n?/, ""),
    "normalized-events": ingestionSection(result.ingestion).replace(/^## Normalized Events\n\n?/, ""),
    timeline: timelineTable(result.timeline),
    indicators: indicatorTable(result.indicators),
    "recommended-actions": bulletList(result.recommendedActions),
    notes: bulletList(result.notes),
    limitations: bulletList([
      ...(result.reasoning?.assumptions.map((item) => `Assumption: ${item}`) ?? []),
      ...(result.reasoning?.unknowns.map((item) => `Unknown: ${item}`) ?? []),
      "This report is for defensive review and requires analyst approval before external use."
    ])
  };
}

export function validateRequiredReportSections(template: ReportTemplate, contentMarkdown: string): string[] {
  return template.sections
    .filter((section) => section.required || template.requiredSections.includes(section.id))
    .filter((section) => !new RegExp(`^##\\s+${section.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "im").test(contentMarkdown))
    .map((section) => `Missing required section: ${section.title}.`);
}

export function renderReportFromTemplate(result: Omit<AnalysisResult, "reportMarkdown">, template: ReportTemplate): string {
  const sections = sectionContentById(result);
  const body = template.sections.map((section) => {
    const content = sections[section.id] ?? "Section pending analyst input.";
    return [`## ${section.title}`, content].join("\n");
  });

  return [`# ${result.title}`, "", ...body.join("\n\n").split("\n")].join("\n");
}

export function generateReport(result: Omit<AnalysisResult, "reportMarkdown">): string {
  const template = getReportTemplate("technical-template");
  if (!template) {
    throw new Error("technical_report_template_missing");
  }

  return renderReportFromTemplate(result, template);
}
