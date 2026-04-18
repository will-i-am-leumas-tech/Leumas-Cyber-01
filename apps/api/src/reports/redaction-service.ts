import type { RedactedField, RedactionResult, ReportAudience, ReportDraft } from "../schemas/reports.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

interface RedactionPattern {
  fieldType: RedactedField["fieldType"];
  pattern: RegExp;
  replacement: string;
}

const redactionPatterns: RedactionPattern[] = [
  {
    fieldType: "email",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    replacement: "[REDACTED_EMAIL]"
  },
  {
    fieldType: "ipv4",
    pattern: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
    replacement: "[REDACTED_IP]"
  },
  {
    fieldType: "ipv6",
    pattern: /\b(?:[0-9a-f]{1,4}:){2,7}[0-9a-f]{1,4}\b/gi,
    replacement: "[REDACTED_IP]"
  },
  {
    fieldType: "secret",
    pattern: /\b(?:password|passwd|pwd|secret|token|api[_-]?key)\s*[:=]\s*["']?[^"'\s`]+/gi,
    replacement: "[REDACTED_SECRET]"
  },
  {
    fieldType: "username",
    pattern: /\b(?:user|username|actor|account)\s*[:=]\s*["']?[A-Za-z0-9._\\-]+/gi,
    replacement: "[REDACTED_USER]"
  }
];

function applyPattern(markdown: string, pattern: RedactionPattern): { markdown: string; field?: RedactedField } {
  let count = 0;
  const redacted = markdown.replace(pattern.pattern, () => {
    count += 1;
    return pattern.replacement;
  });

  return {
    markdown: redacted,
    field:
      count > 0
        ? {
            fieldType: pattern.fieldType,
            count,
            replacement: pattern.replacement
          }
        : undefined
  };
}

export function redactReportDraft(draft: ReportDraft, audience: ReportAudience): RedactionResult {
  let redactedMarkdown = draft.contentMarkdown;
  const redactedFields: RedactedField[] = [];

  for (const pattern of redactionPatterns) {
    const result = applyPattern(redactedMarkdown, pattern);
    redactedMarkdown = result.markdown;
    if (result.field) {
      redactedFields.push(result.field);
    }
  }

  return {
    id: createId("redaction"),
    reportId: draft.id,
    audience,
    redactedMarkdown,
    redactedFields,
    warnings:
      audience === "external" && redactedFields.length === 0
        ? ["No sensitive fields matched the basic redaction rules; analyst review is still required."]
        : ["Redaction preview only; analyst approval is required before external distribution."],
    createdAt: nowIso()
  };
}
