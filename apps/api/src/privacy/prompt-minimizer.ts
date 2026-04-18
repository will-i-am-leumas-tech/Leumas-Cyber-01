import type { PromptPackage, RedactionMode, SensitiveFinding } from "../schemas/privacy.schema";
import { sha256Text } from "../reasoning/hash";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import { applyRedactions } from "./redaction-service";
import { summarizeSensitiveFindings } from "./sensitive-data-detector";

export interface PromptMinimizationResult {
  promptText: string;
  packageRecord: PromptPackage;
}

export function minimizePromptInput(input: {
  caseId: string;
  provider: string;
  text: string;
  findings: SensitiveFinding[];
  mode?: RedactionMode;
}): PromptMinimizationResult {
  const mode = input.mode ?? "redact";
  const promptText = mode === "redact" ? applyRedactions(input.text, input.findings) : input.text;
  const excludedFindingIds = mode === "redact" ? input.findings.map((finding) => finding.id) : [];

  return {
    promptText,
    packageRecord: {
      id: createId("prompt_package"),
      caseId: input.caseId,
      mode,
      provider: input.provider,
      minimizedFields: mode === "redact" ? ["input.text", "input.files.text", "input.json"] : [],
      excludedFindingIds,
      redactionSummary: summarizeSensitiveFindings(input.findings),
      promptHash: sha256Text(promptText),
      rawInputHash: sha256Text(input.text),
      createdAt: nowIso()
    }
  };
}
