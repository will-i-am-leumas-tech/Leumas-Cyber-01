import { forensicCollectionTaskSchema, type CollectionPlanRequest, type ForensicCollectionTask } from "../schemas/malware-forensics.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

function task(input: {
  caseId: string;
  artifact: string;
  platform: CollectionPlanRequest["platform"];
  priority: ForensicCollectionTask["priority"];
  reason: string;
  owner: string;
}): ForensicCollectionTask {
  return forensicCollectionTaskSchema.parse({
    id: createId("collection_task"),
    caseId: input.caseId,
    artifact: input.artifact,
    platform: input.platform,
    priority: input.priority,
    reason: input.reason,
    status: "open",
    owner: input.owner,
    createdAt: nowIso()
  });
}

export function planForensicCollection(caseId: string, request: CollectionPlanRequest): ForensicCollectionTask[] {
  const tasks = [
    task({
      caseId,
      artifact: "endpoint process creation timeline",
      platform: request.platform,
      priority: "high",
      reason: "Establish parent-child process context and execution timing.",
      owner: request.owner
    }),
    task({
      caseId,
      artifact: "file hash and source path metadata",
      platform: request.platform,
      priority: "high",
      reason: "Preserve static indicators and chain-of-custody context.",
      owner: request.owner
    })
  ];

  if (request.evidenceGaps.some((gap) => /network|dns|proxy/i.test(gap)) || request.suspectedBehaviors.some((item) => /network|c2|callback/i.test(item))) {
    tasks.push(
      task({
        caseId,
        artifact: "network connections and DNS cache",
        platform: request.platform,
        priority: "medium",
        reason: "Close network evidence gaps with defensive telemetry.",
        owner: request.owner
      })
    );
  }

  if (request.platform === "windows" || request.evidenceGaps.some((gap) => /registry|persistence/i.test(gap))) {
    tasks.push(
      task({
        caseId,
        artifact: "registry autorun and service inventory",
        platform: request.platform,
        priority: "medium",
        reason: "Check persistence-relevant locations without changing system state.",
        owner: request.owner
      })
    );
  }

  return tasks;
}
