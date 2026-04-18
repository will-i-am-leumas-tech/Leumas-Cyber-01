import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { listConnectors } from "../../apps/api/src/tools/connector-registry";
import { evaluateToolPolicy } from "../../apps/api/src/tools/tool-policy";
import { runToolCall } from "../../apps/api/src/tools/tool-runner";
import type { ToolCallRequest } from "../../apps/api/src/schemas/tools.schema";

describe("tool services", () => {
  it("denies unknown connector operations", async () => {
    const denied = JSON.parse(await readFile("data/fixtures/tools/denied-tool-call.json", "utf8")) as ToolCallRequest;
    const connector = listConnectors().find((candidate) => candidate.id === denied.connectorId);
    const decision = evaluateToolPolicy({
      connector,
      operation: denied.operation
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("operation_not_allowed");
  });

  it("does not serialize raw credential secrets in connector metadata", () => {
    const connectors = listConnectors();

    expect(connectors).toHaveLength(1);
    expect(JSON.stringify(connectors)).not.toMatch(/api[_-]?key|secret|token/i);
    expect(connectors[0].credentialRef).toEqual({ type: "none", ref: "mock" });
  });

  it("runs allowed mock SIEM searches and stores only a parameter hash on tool calls", async () => {
    const result = await runToolCall({
      caseId: "case_test",
      index: 1,
      request: {
        connectorId: "mock-siem",
        operation: "search_events",
        actor: "analyst@example.test",
        parameters: {
          query: "203.0.113.10",
          limit: 2
        }
      }
    });

    expect(result.allowed).toBe(true);
    expect(result.toolCall.parametersHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(result.toolCall)).not.toContain("203.0.113.10");
    expect(result.toolResult?.records).toHaveLength(2);
  });
});
