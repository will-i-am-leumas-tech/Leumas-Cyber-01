import type { EgressDecision, SandboxNetworkPolicy } from "../schemas/sandbox.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export const sandboxEgressPolicyVersion = "sandbox-egress-v1-2026-04-18";

function destinationFromParameters(parameters: Record<string, unknown>): string | undefined {
  const raw =
    parameters.destination ??
    parameters.host ??
    parameters.hostname ??
    parameters.url ??
    parameters.endpoint ??
    parameters.target;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return undefined;
  }
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return raw.toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  }
}

function targetAllowed(destination: string, allowedTargets: string[]): boolean {
  return allowedTargets.some((target) => destination === target || destination.endsWith(`.${target}`));
}

export function evaluateEgressPolicy(input: {
  runId: string;
  network: SandboxNetworkPolicy;
  parameters: Record<string, unknown>;
}): EgressDecision {
  const destination = destinationFromParameters(input.parameters);
  if (!destination) {
    return {
      id: createId("egress_decision"),
      runId: input.runId,
      allowed: true,
      reason: "No network destination requested.",
      policyVersion: sandboxEgressPolicyVersion,
      createdAt: nowIso()
    };
  }

  if (input.network.mode === "none") {
    return {
      id: createId("egress_decision"),
      runId: input.runId,
      destination,
      allowed: false,
      reason: "Manifest does not allow network egress.",
      policyVersion: sandboxEgressPolicyVersion,
      createdAt: nowIso()
    };
  }

  const allowed = targetAllowed(destination, input.network.allowedTargets);
  return {
    id: createId("egress_decision"),
    runId: input.runId,
    destination,
    allowed,
    reason: allowed ? "Destination matched the manifest allowlist." : "Destination is outside the manifest allowlist.",
    policyVersion: sandboxEgressPolicyVersion,
    createdAt: nowIso()
  };
}
