import type { KnowledgeSource } from "../schemas/knowledge.schema";
import type { KnowledgeApproval, PatchKnowledgeApprovalInput } from "../schemas/knowledge-v2.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

const unsafeKnowledgeSignals = [/credential theft/i, /disable defender/i, /persistence after reboot/i, /stealth/i, /malware that/i];

export function classifyKnowledgeApproval(text: string, requested: KnowledgeSource["approvalState"]): KnowledgeSource["approvalState"] {
  return unsafeKnowledgeSignals.some((signal) => signal.test(text)) ? "quarantined" : requested;
}

export function buildKnowledgeApproval(sourceId: string, input: PatchKnowledgeApprovalInput): KnowledgeApproval {
  return {
    id: createId("knowledge_approval"),
    sourceId,
    reviewer: input.reviewer,
    status: input.status,
    reason: input.reason,
    timestamp: nowIso()
  };
}
