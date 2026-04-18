import type { ReportTemplate } from "../schemas/reports.schema";

const templates: ReportTemplate[] = [
  {
    id: "executive-template",
    name: "Executive Incident Brief",
    audience: "executive",
    requiredSections: ["overview", "severity", "key-findings", "recommended-actions", "limitations"],
    sections: [
      {
        id: "overview",
        title: "Overview",
        required: true,
        guidance: "Summarize what happened, current risk, and operational impact."
      },
      {
        id: "severity",
        title: "Severity",
        required: true,
        guidance: "State severity and confidence in business-friendly terms."
      },
      {
        id: "key-findings",
        title: "Key Findings",
        required: true,
        guidance: "List the most important claims with evidence citations."
      },
      {
        id: "recommended-actions",
        title: "Recommended Actions",
        required: true,
        guidance: "List defensive next steps requiring owner review."
      },
      {
        id: "limitations",
        title: "Limitations",
        required: true,
        guidance: "Call out assumptions, unknowns, and review needs."
      }
    ],
    fieldRules: [
      {
        sectionId: "overview",
        required: true,
        maxLength: 1200,
        redactForAudiences: ["external"]
      },
      {
        sectionId: "key-findings",
        required: true,
        redactForAudiences: ["external"]
      }
    ]
  },
  {
    id: "technical-template",
    name: "Technical Incident Report",
    audience: "technical",
    requiredSections: [
      "overview",
      "severity",
      "findings",
      "evidence-reasoning",
      "timeline",
      "indicators",
      "recommended-actions",
      "notes"
    ],
    sections: [
      {
        id: "overview",
        title: "Overview",
        required: true,
        guidance: "Explain the case summary and technical scope."
      },
      {
        id: "severity",
        title: "Severity",
        required: true,
        guidance: "State severity, confidence, and category."
      },
      {
        id: "findings",
        title: "Findings",
        required: true,
        guidance: "List findings and evidence references."
      },
      {
        id: "evidence-reasoning",
        title: "Evidence Reasoning",
        required: true,
        guidance: "Show source-linked observations, hypotheses, assumptions, and unknowns."
      },
      {
        id: "knowledge-sources",
        title: "Knowledge Sources",
        required: false,
        guidance: "Cite retrieved standards, internal sources, or vendor guidance."
      },
      {
        id: "normalized-events",
        title: "Normalized Events",
        required: false,
        guidance: "Summarize parser output and telemetry coverage."
      },
      {
        id: "timeline",
        title: "Timeline",
        required: true,
        guidance: "List timestamped events extracted from evidence."
      },
      {
        id: "indicators",
        title: "Indicators",
        required: true,
        guidance: "List normalized defensive indicators."
      },
      {
        id: "recommended-actions",
        title: "Recommended Actions",
        required: true,
        guidance: "Provide defensive response and investigation actions."
      },
      {
        id: "notes",
        title: "Notes",
        required: true,
        guidance: "Capture review notes and residual uncertainty."
      }
    ],
    fieldRules: [
      {
        sectionId: "findings",
        required: true,
        redactForAudiences: ["external"]
      },
      {
        sectionId: "indicators",
        required: true,
        redactForAudiences: ["external"]
      }
    ]
  }
];

export function getReportTemplates(): ReportTemplate[] {
  return templates.map((template) => ({
    ...template,
    sections: template.sections.map((section) => ({ ...section })),
    fieldRules: template.fieldRules.map((rule) => ({
      ...rule,
      redactForAudiences: [...rule.redactForAudiences]
    })),
    requiredSections: [...template.requiredSections]
  }));
}

export function getReportTemplate(templateId: string): ReportTemplate | undefined {
  return getReportTemplates().find((template) => template.id === templateId);
}
