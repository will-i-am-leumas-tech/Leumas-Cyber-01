import type { IndicatorLifecycle, PatchIndicatorLifecycleInput } from "../schemas/threat-intel.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export function isIndicatorLifecycleExpired(lifecycle: Pick<IndicatorLifecycle, "expiresAt" | "status">, at = nowIso()): boolean {
  return lifecycle.status === "expired" || Boolean(lifecycle.expiresAt && lifecycle.expiresAt < at);
}

export function buildIndicatorLifecycle(indicatorId: string, input: PatchIndicatorLifecycleInput): IndicatorLifecycle {
  return {
    id: createId("indicator_lifecycle"),
    indicatorId,
    status: input.expiresAt && input.expiresAt < nowIso() ? "expired" : input.status,
    expiresAt: input.expiresAt,
    falsePositiveReason: input.falsePositiveReason,
    owner: input.owner,
    updatedAt: nowIso()
  };
}
