import type { ConnectorDefinition, ConnectorQueryRequest } from "../schemas/connectors.schema";

export interface ConnectorPolicyDecision {
  allowed: boolean;
  reason: string;
}

const deniedOperationSignals = /\b(delete|disable|block|quarantine|isolate|modify|update|create|execute|run|contain)\b/i;

export function evaluateConnectorPolicy(input: {
  definition?: ConnectorDefinition;
  request: ConnectorQueryRequest;
}): ConnectorPolicyDecision {
  if (!input.definition) {
    return {
      allowed: false,
      reason: "connector_not_found"
    };
  }

  if (!input.definition.enabled) {
    return {
      allowed: false,
      reason: "connector_disabled"
    };
  }

  const operation = input.definition.operations.find((candidate) => candidate.id === input.request.operation);
  if (!operation) {
    return {
      allowed: false,
      reason: "operation_not_allowed"
    };
  }

  if (!operation.readOnly || deniedOperationSignals.test(input.request.operation)) {
    return {
      allowed: false,
      reason: "operation_not_read_only"
    };
  }

  return {
    allowed: true,
    reason: "read_only_operation_allowed"
  };
}
