import type { ToolCall, ToolCallRequest, ToolResult } from "../schemas/tools.schema";
import type { SandboxArtifact, SandboxRun } from "../schemas/sandbox.schema";
import { sha256Text } from "../reasoning/hash";
import { nowIso } from "../utils/time";
import { runSandboxedOperation } from "../sandbox/sandbox-runner";
import { getConnector } from "./connector-registry";
import { evaluateToolPolicy } from "./tool-policy";
import type { ConnectorExecutionResult } from "./connectors/mock-siem.connector";

export interface ToolRunResponse {
  allowed: boolean;
  reason?: string;
  toolCall: ToolCall;
  toolResult?: ToolResult;
  sandboxRun?: SandboxRun;
  sandboxArtifacts?: SandboxArtifact[];
}

export async function runToolCall(input: { caseId: string; request: ToolCallRequest; index: number }): Promise<ToolRunResponse> {
  const connector = getConnector(input.request.connectorId);
  const timestamp = nowIso();
  const parametersHash = sha256Text(JSON.stringify(input.request.parameters));
  const policy = evaluateToolPolicy({
    connector: connector?.metadata,
    operation: input.request.operation,
    parameters: input.request.parameters
  });
  const toolCallBase = {
    id: `tool_call_${String(input.index).padStart(3, "0")}`,
    caseId: input.caseId,
    connectorId: input.request.connectorId,
    operation: input.request.operation,
    actor: input.request.actor,
    parametersHash,
    timestamp
  };

  if (!policy.allowed) {
    return {
      allowed: false,
      reason: policy.reason,
      toolCall: {
        ...toolCallBase,
        status: "denied",
        summary: `Tool call denied: ${policy.reason}.`
      }
    };
  }

  if (!connector) {
    throw new Error("Connector passed policy without registry entry.");
  }
  if (!policy.manifest) {
    throw new Error("Connector passed policy without sandbox manifest.");
  }

  try {
    let execution: ConnectorExecutionResult | undefined;
    const sandbox = await runSandboxedOperation({
      caseId: input.caseId,
      manifest: policy.manifest,
      actor: input.request.actor,
      parameters: input.request.parameters,
      execute: async () => {
        execution = await connector.execute(input.request.operation, input.request.parameters);
        return {
          summary: execution.summary,
          stdout: JSON.stringify(
            {
              recordRefs: execution.recordRefs,
              sensitiveFields: execution.sensitiveFields,
              recordCount: execution.records.length
            },
            null,
            2
          ),
          records: execution.records
        };
      }
    });
    if (sandbox.run.status !== "completed") {
      return {
        allowed: false,
        reason: sandbox.run.policyDecision.reason,
        sandboxRun: sandbox.run,
        sandboxArtifacts: sandbox.artifacts,
        toolCall: {
          ...toolCallBase,
          status: "denied",
          sandboxRunId: sandbox.run.id,
          summary: `Tool call denied by sandbox: ${sandbox.run.policyDecision.reason}.`
        }
      };
    }

    if (!execution) {
      throw new Error("Sandbox completed without connector execution output.");
    }
    return {
      allowed: true,
      sandboxRun: sandbox.run,
      sandboxArtifacts: sandbox.artifacts,
      toolCall: {
        ...toolCallBase,
        sandboxRunId: sandbox.run.id,
        status: "completed",
        summary: execution.summary
      },
      toolResult: {
        id: `tool_result_${String(input.index).padStart(3, "0")}`,
        toolCallId: toolCallBase.id,
        status: "success",
        summary: execution.summary,
        recordRefs: execution.recordRefs,
        records: execution.records,
        sensitiveFields: execution.sensitiveFields,
        sandboxArtifactIds: sandbox.artifacts.map((artifact) => artifact.id),
        redactionStatus: execution.sensitiveFields.length > 0 ? "redacted" : "not_required"
      }
    };
  } catch (error) {
    return {
      allowed: true,
      sandboxRun: undefined,
      sandboxArtifacts: [],
      toolCall: {
        ...toolCallBase,
        status: "failed",
        summary: error instanceof Error ? error.message : "Tool execution failed."
      },
      toolResult: {
        id: `tool_result_${String(input.index).padStart(3, "0")}`,
        toolCallId: toolCallBase.id,
        status: "error",
        summary: error instanceof Error ? error.message : "Tool execution failed.",
        recordRefs: [],
        records: [],
        sensitiveFields: [],
        sandboxArtifactIds: [],
        redactionStatus: "not_required"
      }
    };
  }
}
