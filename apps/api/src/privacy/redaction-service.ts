import type { RedactedArtifact, SensitiveFinding } from "../schemas/privacy.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export const redactionPolicyVersion = "privacy-redaction-2026-04-17.1";

export function applyRedactions(text: string, findings: SensitiveFinding[]): string {
  let redacted = "";
  let cursor = 0;
  for (const finding of [...findings].sort((a, b) => a.start - b.start)) {
    redacted += text.slice(cursor, finding.start);
    redacted += finding.redactionValue;
    cursor = finding.end;
  }
  redacted += text.slice(cursor);
  return redacted;
}

export function buildRedactedArtifact(input: {
  originalRef: string;
  text: string;
  findings: SensitiveFinding[];
}): RedactedArtifact {
  return {
    id: createId("redacted_artifact"),
    originalRef: input.originalRef,
    redactedRef: `${input.originalRef}:redacted`,
    redactedText: applyRedactions(input.text, input.findings),
    findingIds: input.findings.map((finding) => finding.id),
    redactionPolicyVersion,
    createdAt: nowIso()
  };
}
