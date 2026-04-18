import type { SandboxResourceLimits } from "../schemas/sandbox.schema";

export interface ResourceLimitResult {
  allowed: boolean;
  reason: string;
}

export function enforceInputResourceLimits(input: {
  parameters: Record<string, unknown>;
  limits: SandboxResourceLimits;
}): ResourceLimitResult {
  const limit = input.parameters.limit;
  if (typeof limit === "number" && limit > input.limits.maxRecords) {
    return {
      allowed: false,
      reason: `Requested record limit ${limit} exceeds maxRecords ${input.limits.maxRecords}.`
    };
  }

  const serialized = JSON.stringify(input.parameters);
  if (Buffer.byteLength(serialized, "utf8") > input.limits.maxOutputBytes) {
    return {
      allowed: false,
      reason: "Input envelope exceeds maxOutputBytes budget."
    };
  }

  return {
    allowed: true,
    reason: "Resource request is within manifest limits."
  };
}

export function applyOutputLimit(text: string, limits: Pick<SandboxResourceLimits, "maxOutputBytes">): {
  text: string;
  truncated: boolean;
} {
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes <= limits.maxOutputBytes) {
    return { text, truncated: false };
  }

  return {
    text: `${Buffer.from(text).subarray(0, limits.maxOutputBytes).toString("utf8")}\n[truncated by sandbox output limit]`,
    truncated: true
  };
}

export function didTimeOut(startedAtMs: number, completedAtMs: number, limits: SandboxResourceLimits): boolean {
  return completedAtMs - startedAtMs > limits.timeoutMs;
}
