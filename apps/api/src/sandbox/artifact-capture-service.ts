import type { SandboxArtifact, SandboxArtifactPolicy, SandboxArtifactType, SandboxResourceLimits } from "../schemas/sandbox.schema";
import { sha256Text } from "../reasoning/hash";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import { applyOutputLimit } from "./resource-limits";

const secretPatterns = [
  /\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|token|password|passwd|pwd|secret)\s*[:=]\s*["']?[^"'\s,;]+/gi,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/g
];

export function redactSandboxText(text: string): { text: string; redacted: boolean } {
  let redacted = text;
  for (const pattern of secretPatterns) {
    redacted = redacted.replace(pattern, "[REDACTED_SECRET]");
  }
  return {
    text: redacted,
    redacted: redacted !== text
  };
}

export function captureSandboxArtifact(input: {
  runId: string;
  type: SandboxArtifactType;
  ref: string;
  content: string;
  policy: SandboxArtifactPolicy;
  limits: Pick<SandboxResourceLimits, "maxOutputBytes">;
}): SandboxArtifact {
  const redaction = input.policy.redactSecrets ? redactSandboxText(input.content) : { text: input.content, redacted: false };
  const limited = applyOutputLimit(redaction.text, input.limits);
  const summary = limited.truncated ? "Captured artifact with output truncation." : "Captured sandbox artifact.";

  return {
    id: createId("sandbox_artifact"),
    runId: input.runId,
    type: input.type,
    ref: input.ref,
    hash: sha256Text(limited.text),
    redactionStatus: redaction.redacted ? "redacted" : "not_required",
    size: Buffer.byteLength(limited.text, "utf8"),
    summary,
    createdAt: nowIso()
  };
}
