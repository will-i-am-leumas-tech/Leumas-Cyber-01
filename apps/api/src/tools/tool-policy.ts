import type { Connector } from "../schemas/tools.schema";
import type { ToolManifest } from "../schemas/sandbox.schema";
import { evaluateEgressPolicy } from "../sandbox/egress-policy";
import { getToolManifestForOperation } from "../sandbox/tool-manifest-registry";

export interface ToolPolicyDecision {
  allowed: boolean;
  reason?: string;
  manifest?: ToolManifest;
}

const allowedOperationsByConnector: Record<string, string[]> = {
  "mock-siem": ["search_events"]
};

export function evaluateToolPolicy(input: {
  connector?: Connector;
  operation: string;
  parameters?: Record<string, unknown>;
}): ToolPolicyDecision {
  if (!input.connector) {
    return {
      allowed: false,
      reason: "connector_not_found"
    };
  }

  if (!input.connector.enabled) {
    return {
      allowed: false,
      reason: "connector_disabled"
    };
  }

  const allowedOperations = allowedOperationsByConnector[input.connector.id] ?? [];
  if (!allowedOperations.includes(input.operation)) {
    return {
      allowed: false,
      reason: "operation_not_allowed"
    };
  }

  const manifest = getToolManifestForOperation(input.connector.id, input.operation);
  if (!manifest || !manifest.enabled) {
    return {
      allowed: false,
      reason: "manifest_not_enabled"
    };
  }

  if (input.parameters) {
    const egress = evaluateEgressPolicy({
      runId: "tool_policy_preview",
      network: manifest.network,
      parameters: input.parameters
    });
    if (!egress.allowed) {
      return {
        allowed: false,
        reason: "egress_denied",
        manifest
      };
    }
  }

  return { allowed: true, manifest };
}
