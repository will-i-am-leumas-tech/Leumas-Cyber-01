import type { CyberCase } from "../schemas/case.schema";
import type { DetectionIntent } from "../schemas/detections.schema";
import type { StixObjectRecord } from "../schemas/threat-intel-v2.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

function evidenceRefsForCase(cyberCase: CyberCase): string[] {
  const reasoningRefs =
    cyberCase.result?.reasoning?.findings.flatMap((finding) => finding.evidenceObservationIds.map((id) => `${finding.id}:${id}`)) ?? [];
  const eventRefs =
    cyberCase.result?.ingestion?.normalizedEvents.map((event) =>
      event.rawRef.lineNumber
        ? `${event.rawRef.artifactId}:line:${event.rawRef.lineNumber}`
        : `${event.rawRef.artifactId}:${event.rawRef.jsonPointer ?? event.rawRef.parserId}`
    ) ?? [];
  const refs = [...reasoningRefs, ...eventRefs];
  return refs.length > 0 ? [...new Set(refs)] : ["case:summary"];
}

function entitiesForCase(cyberCase: CyberCase): string[] {
  return cyberCase.result?.ingestion?.entities.map((entity) => entity.id) ?? [];
}

function behaviorForCategory(cyberCase: CyberCase): Pick<DetectionIntent, "behavior" | "dataSources" | "category"> {
  const category = cyberCase.result?.category ?? "general-monitoring";
  const title = cyberCase.result?.title.toLowerCase() ?? "";

  if (category === "execution" || title.includes("powershell")) {
    return {
      behavior: "Suspicious PowerShell execution with encoded command indicators",
      category: "execution",
      dataSources: ["endpoint.process_creation", "windows.event_4688"]
    };
  }

  if (category === "credential-access") {
    return {
      behavior: "Repeated failed authentication activity followed by possible successful access",
      category: "credential-access",
      dataSources: ["identity.authentication", "windows.event_4624", "windows.event_4625"]
    };
  }

  if (category === "indicator-review") {
    return {
      behavior: "Internal telemetry matching reviewed indicators",
      category: "indicator-review",
      dataSources: ["siem.events", "dns.logs", "proxy.logs", "endpoint.events"]
    };
  }

  return {
    behavior: `Defensive monitoring for ${category}`,
    category,
    dataSources: ["siem.events"]
  };
}

export function buildDetectionIntent(cyberCase: CyberCase, index: number): DetectionIntent {
  const behavior = behaviorForCategory(cyberCase);

  return {
    id: `detection_intent_${String(index).padStart(3, "0")}`,
    behavior: behavior.behavior,
    category: behavior.category,
    severity: cyberCase.result?.severity ?? cyberCase.severity,
    dataSources: behavior.dataSources,
    entities: entitiesForCase(cyberCase),
    evidenceRefs: evidenceRefsForCase(cyberCase),
    createdAt: nowIso()
  };
}

export function buildDetectionIntentFromIntel(input: {
  indicators: StixObjectRecord[];
  severity: DetectionIntent["severity"];
  dataSources: string[];
}): DetectionIntent {
  const labels = input.indicators.map((indicator) => indicator.indicatorValue ?? indicator.name ?? indicator.id);
  const behavior =
    labels.length === 1
      ? `Internal telemetry matching intelligence indicator ${labels[0]}`
      : `Internal telemetry matching ${labels.length} intelligence indicators`;

  return {
    id: createId("detection_intent"),
    behavior,
    category: "indicator-review",
    severity: input.severity,
    dataSources: input.dataSources,
    entities: labels,
    evidenceRefs: input.indicators.map((indicator) => `intel:${indicator.sourceId}:${indicator.id}`),
    createdAt: nowIso()
  };
}
