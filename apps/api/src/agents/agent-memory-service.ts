import type { CyberCase } from "../schemas/case.schema";
import type { AgentMemoryItem } from "../schemas/agents-v2.schema";
import { createId } from "../utils/ids";

const dayMs = 24 * 60 * 60 * 1000;

export function buildAgentMemory(cyberCase: CyberCase, source = "orchestrator-v2"): AgentMemoryItem[] {
  const createdAt = Date.now();
  const expiresAt = new Date(createdAt + 14 * dayMs).toISOString();
  const findingItems =
    cyberCase.result?.reasoning?.findings.map((finding) => ({
      id: createId("agent_memory"),
      caseId: cyberCase.id,
      evidenceIds: finding.evidenceObservationIds,
      summary: `${finding.title}: ${finding.reasoningSummary}`,
      source,
      expiresAt,
      reviewState: "pending" as const
    })) ?? [];
  const toolItems = cyberCase.sandboxRuns.map((run) => ({
    id: createId("agent_memory"),
    caseId: cyberCase.id,
    evidenceIds: [run.id],
    summary: `Sandbox run ${run.status} for ${run.manifestId}.`,
    source,
    expiresAt,
    reviewState: "pending" as const
  }));

  return [...findingItems, ...toolItems];
}
