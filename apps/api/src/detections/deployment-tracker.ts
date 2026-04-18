import {
  detectionDeploymentSchema,
  type DetectionDeployment,
  type DetectionDeploymentRequest,
  type DetectionRuleV2
} from "../schemas/detections-v2.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export function createDetectionDeployment(rule: DetectionRuleV2, input: DetectionDeploymentRequest): DetectionDeployment {
  const timestamp = nowIso();
  return detectionDeploymentSchema.parse({
    id: createId("detection_deployment"),
    ruleId: rule.id,
    backend: input.backend,
    version: input.version,
    status: input.status,
    owner: input.owner,
    driftStatus: input.driftStatus,
    deployedAt: input.status === "deployed" ? timestamp : undefined,
    notes: input.notes,
    createdAt: timestamp,
    updatedAt: timestamp
  });
}
