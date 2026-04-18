import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createStandardOrchestration } from "../../apps/api/src/agents/agent-orchestrator";
import { canRoleUseTool } from "../../apps/api/src/agents/agent-task-service";
import { resultPassed, validateAgentOutput } from "../../apps/api/src/agents/result-validator";
import type { AgentRoleId } from "../../apps/api/src/schemas/agents.schema";
import { cyberCaseSchema, type CyberCase } from "../../apps/api/src/schemas/case.schema";

interface StandardAgentPlanFixture {
  plan: string;
  roles: AgentRoleId[];
  expectedTaskCount: number;
  expectedSchemas: Record<AgentRoleId, string>;
}

function buildCase(reportMarkdown = "# Suspicious PowerShell\n\n## Overview\nA document process spawned PowerShell."): CyberCase {
  return cyberCaseSchema.parse({
    id: "case_agents_001",
    title: "Suspicious PowerShell",
    createdAt: "2026-04-16T10:20:00.000Z",
    updatedAt: "2026-04-16T10:20:00.000Z",
    inputType: "inline:text",
    mode: "logs",
    rawInputRef: "memory://unit-test",
    normalizedArtifacts: [],
    severity: "high",
    summary: "Document process spawned encoded PowerShell on workstation WS-42.",
    recommendations: ["Collect process tree evidence and validate endpoint telemetry."],
    reportMarkdown,
    result: {
      title: "Suspicious PowerShell",
      severity: "high",
      confidence: 0.9,
      category: "endpoint_process",
      summary: "Document process spawned encoded PowerShell on workstation WS-42.",
      evidence: ["WINWORD.EXE spawned powershell.exe with EncodedCommand."],
      recommendedActions: ["Collect process tree evidence and validate endpoint telemetry."],
      indicators: [
        {
          type: "hostname",
          value: "WS-42",
          normalized: "ws-42"
        }
      ],
      timeline: [
        {
          timestamp: "2026-04-16T10:15:00.000Z",
          label: "WINWORD spawned PowerShell"
        }
      ],
      ingestion: {
        artifacts: [
          {
            id: "artifact_log_001",
            filename: "windows-process.log",
            mediaType: "text/plain",
            hash: "hash",
            sizeBytes: 300,
            storageRef: "memory://artifact-log-001",
            source: "inline",
            createdAt: "2026-04-16T10:20:00.000Z"
          }
        ],
        normalizedEvents: [
          {
            id: "event_001",
            timestamp: "2026-04-16T10:15:00.000Z",
            source: "windows",
            eventType: "process_start",
            severity: "high",
            asset: "WS-42",
            process: {
              image: "powershell.exe",
              parentImage: "WINWORD.EXE",
              commandLine: "powershell.exe -EncodedCommand SQBFAFgA"
            },
            rawRef: {
              artifactId: "artifact_log_001",
              parserId: "windows-process",
              lineNumber: 2
            }
          }
        ],
        entities: [
          {
            id: "entity_host_ws42",
            type: "host",
            value: "WS-42",
            normalized: "ws-42"
          }
        ],
        parserWarnings: []
      },
      knowledge: {
        query: "powershell encoded command from office parent",
        results: [
          {
            chunkId: "knowledge_chunk_001",
            score: 0.95,
            excerpt: "Office spawning PowerShell should be investigated with command-line telemetry.",
            citation: {
              sourceId: "knowledge_windows_logging",
              title: "Windows Logging Baseline",
              uri: "local://knowledge/windows-logging-baseline",
              location: "PowerShell section",
              trustTier: "internal",
              version: "1",
              stale: false
            }
          }
        ],
        snapshots: [
          {
            id: "retrieval_snapshot_001",
            caseId: "case_agents_001",
            query: "powershell encoded command from office parent",
            resultChunkIds: ["knowledge_chunk_001"],
            createdAt: "2026-04-16T10:20:00.000Z",
            promptIncluded: true
          }
        ],
        warnings: []
      },
      reasoning: {
        observations: [
          {
            id: "observation_001",
            type: "fact",
            value: "WINWORD.EXE spawned powershell.exe with an encoded command.",
            confidence: 0.95,
            sourceRef: {
              id: "artifact_log_001",
              type: "input",
              locator: "windows-process.log:2"
            },
            entityRefs: ["entity_host_ws42"]
          }
        ],
        hypotheses: [
          {
            id: "hypothesis_001",
            title: "Suspicious Office child process",
            status: "supported",
            confidence: 0.88,
            reasoningSummary: "The parent and command-line pattern match suspicious script execution.",
            supportingObservationIds: ["observation_001"]
          }
        ],
        findings: [
          {
            id: "finding_001",
            title: "Office spawned encoded PowerShell",
            severity: "high",
            category: "execution",
            confidence: 0.9,
            reasoningSummary: "The event chain supports suspicious execution requiring investigation.",
            evidenceObservationIds: ["observation_001"],
            recommendations: ["Preserve endpoint telemetry and inspect the originating document."],
            needsAnalystReview: false
          }
        ],
        reasoningRuns: [
          {
            id: "reasoning_run_001",
            provider: "local",
            model: "deterministic-fixture",
            promptVersion: "test",
            inputHash: "hash",
            validationStatus: "passed",
            validationSummary: "Source-linked finding validated.",
            startedAt: "2026-04-16T10:20:00.000Z",
            completedAt: "2026-04-16T10:20:00.000Z"
          }
        ]
      },
      reportMarkdown,
      notes: ["Analyst should confirm endpoint telemetry coverage."]
    },
    auditEntries: []
  });
}

describe("agent orchestrator", () => {
  it("creates expected bounded tasks for the standard log plan", async () => {
    const plan = JSON.parse(await readFile("data/fixtures/agents/standard-log-plan.json", "utf8")) as StandardAgentPlanFixture;
    const outcome = createStandardOrchestration(buildCase(), plan.plan);

    expect(outcome.run.finalStatus).toBe("completed");
    expect(outcome.tasks).toHaveLength(plan.expectedTaskCount);
    expect(outcome.tasks.map((task) => task.role)).toEqual(plan.roles);
    expect(outcome.tasks.map((task) => task.expectedSchema)).toEqual(plan.roles.map((role) => plan.expectedSchemas[role]));
    expect(outcome.results.every(resultPassed)).toBe(true);
    expect(outcome.arbitration.selectedFindingIds).toEqual(["finding_001"]);
    expect(outcome.arbitration.validationStatus).toBe("passed");
  });

  it("fails validation for malformed agent output", async () => {
    const invalid = JSON.parse(await readFile("data/fixtures/agents/invalid-agent-result.json", "utf8")) as {
      role: AgentRoleId;
      output: Record<string, unknown>;
    };

    const validation = validateAgentOutput(invalid.role, invalid.output);

    expect(validation.valid).toBe(false);
    expect(validation.warnings.join(" ")).toMatch(/artifactCount|eventCount|parserWarningCount/);
  });

  it("blocks unauthorized tool requests at the role boundary", () => {
    expect(canRoleUseTool("toolExecutor", "mock-siem.search_events")).toBe(true);
    expect(canRoleUseTool("investigator", "mock-siem.search_events")).toBe(false);
    expect(canRoleUseTool("parser", "knowledge.search")).toBe(false);
  });

  it("lets the safety reviewer block unsafe final output before promotion", () => {
    const unsafeReport = "# Unsafe Draft\n\n## Overview\nThe provider draft includes a reverse shell section and must be withheld.";
    const outcome = createStandardOrchestration(buildCase(unsafeReport));
    const safetyTask = outcome.tasks.find((task) => task.role === "safetyReviewer");
    const safetyResult = outcome.results.find((result) => result.role === "safetyReviewer");

    expect(outcome.run.finalStatus).toBe("blocked");
    expect(safetyTask?.status).toBe("blocked");
    expect(safetyResult?.validationStatus).toBe("passed");
    expect(safetyResult?.output).toMatchObject({ allowed: false });
    expect(outcome.arbitration.validationStatus).toBe("failed");
    expect(outcome.arbitration.conflicts).toEqual(expect.arrayContaining(["Safety reviewer blocked final output."]));
  });
});
