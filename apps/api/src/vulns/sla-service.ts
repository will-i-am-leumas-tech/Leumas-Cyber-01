import {
  vulnerabilitySlaSchema,
  type UpdateVulnerabilitySlaInput,
  type VulnerabilitySla
} from "../schemas/vulnerabilities-v2.schema";
import type { VulnerabilityFinding } from "../schemas/vulnerabilities.schema";
import { nowIso } from "../utils/time";

const slaDaysByPriority: Record<VulnerabilityFinding["priority"], number> = {
  critical: 7,
  high: 14,
  medium: 30,
  low: 60
};

function defaultDueDate(priority: VulnerabilityFinding["priority"]): string {
  const due = new Date();
  due.setUTCDate(due.getUTCDate() + slaDaysByPriority[priority]);
  return due.toISOString();
}

export function slaStatusForDueDate(dueDate: string, at = nowIso()): VulnerabilitySla["status"] {
  const dueMs = new Date(dueDate).getTime();
  const atMs = new Date(at).getTime();
  if (Number.isNaN(dueMs) || Number.isNaN(atMs)) {
    return "on_track";
  }
  const daysRemaining = (dueMs - atMs) / 86_400_000;
  if (daysRemaining < 0) {
    return "breached";
  }
  if (daysRemaining <= 3) {
    return "due_soon";
  }
  return "on_track";
}

export function buildVulnerabilitySla(input: {
  finding: VulnerabilityFinding;
  owner: string;
  dueDate?: string;
  escalationPath?: string[];
}): VulnerabilitySla {
  const timestamp = nowIso();
  const dueDate = input.dueDate ?? defaultDueDate(input.finding.priority);

  return vulnerabilitySlaSchema.parse({
    findingId: input.finding.id,
    owner: input.owner,
    dueDate,
    status: slaStatusForDueDate(dueDate, timestamp),
    escalationPath: input.escalationPath ?? [],
    createdAt: timestamp,
    updatedAt: timestamp
  });
}

export function updateVulnerabilitySla(existing: VulnerabilitySla, input: UpdateVulnerabilitySlaInput): VulnerabilitySla {
  const timestamp = nowIso();
  const dueDate = input.dueDate ?? existing.dueDate;
  return vulnerabilitySlaSchema.parse({
    ...existing,
    owner: input.owner ?? existing.owner,
    dueDate,
    status: input.status ?? slaStatusForDueDate(dueDate, timestamp),
    escalationPath: input.escalationPath ?? existing.escalationPath,
    updatedAt: timestamp
  });
}
