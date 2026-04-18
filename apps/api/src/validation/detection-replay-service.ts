import type { ReplayedTelemetryEvent, ValidationCampaignV2, ValidationTemplate } from "../schemas/validation-v2.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export function replayBenignTelemetry(input: {
  campaign: ValidationCampaignV2;
  templates: ValidationTemplate[];
}): ReplayedTelemetryEvent[] {
  return input.templates.flatMap((template) =>
    template.allowedTelemetry.map((telemetryType) => ({
      id: createId("telemetry_replay"),
      campaignId: input.campaign.id,
      templateId: template.id,
      target: input.campaign.target,
      telemetryType,
      summary: `Synthetic lab replay for ${telemetryType} on ${input.campaign.target}.`,
      evidenceId: createId("validation_evidence"),
      generatedAt: nowIso()
    }))
  );
}
