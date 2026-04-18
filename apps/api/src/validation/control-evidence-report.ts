import {
  controlEvidenceReportSchema,
  type ControlEvidenceReport,
  type ReplayedTelemetryEvent,
  type ValidationCampaignV2,
  type ValidationTemplate
} from "../schemas/validation-v2.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export function buildControlEvidenceReport(input: {
  campaign: ValidationCampaignV2;
  templates: ValidationTemplate[];
  replayedTelemetry: ReplayedTelemetryEvent[];
}): ControlEvidenceReport {
  const observed = new Set(input.replayedTelemetry.map((event) => event.telemetryType));
  const requiredTelemetry = input.templates.flatMap((template) => template.allowedTelemetry);
  const missingTelemetry = [...new Set(requiredTelemetry.filter((telemetry) => !observed.has(telemetry)))];
  const gaps = missingTelemetry.map((telemetry) => `Missing expected validation telemetry: ${telemetry}.`);

  return controlEvidenceReportSchema.parse({
    id: createId("control_evidence_report"),
    campaignId: input.campaign.id,
    detectionsObserved: [...observed].filter((telemetry) => telemetry.startsWith("alert:")),
    missingTelemetry,
    gaps,
    remediation:
      gaps.length === 0
        ? ["No remediation gaps observed in this lab replay."]
        : gaps.map((gap) => `Review control telemetry routing and ownership. ${gap}`),
    citations: input.replayedTelemetry.map((event) => event.evidenceId),
    createdAt: nowIso()
  });
}
