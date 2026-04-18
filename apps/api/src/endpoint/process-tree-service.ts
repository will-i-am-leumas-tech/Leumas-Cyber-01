import type { EndpointEvent, ProcessNode, ProcessTree } from "../schemas/endpoint.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

function basename(value = ""): string {
  return value.split(/[\\/]/).pop()?.toLowerCase() ?? value.toLowerCase();
}

function mergeSignals(...signals: string[][]): string[] {
  return [...new Set(signals.flat())];
}

function parentByImage(event: EndpointEvent, candidates: EndpointEvent[]): EndpointEvent | undefined {
  if (!event.parentImage) {
    return undefined;
  }
  const parentName = basename(event.parentImage);
  return candidates
    .filter((candidate) => candidate.host === event.host && basename(candidate.image) === parentName && candidate.timestamp <= event.timestamp)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
}

function childRiskSignals(event: EndpointEvent, parent?: EndpointEvent): string[] {
  const parentName = basename(parent?.image ?? event.parentImage ?? "");
  const imageName = basename(event.image);
  const text = `${event.image} ${event.commandLine ?? ""}`.toLowerCase();
  const signals = [...event.riskSignals];

  if (/(winword|excel|outlook|powerpnt)\.exe/.test(parentName) && /(powershell|cmd|wscript|cscript|mshta)\.exe/.test(imageName)) {
    signals.push("suspicious_office_child");
  }
  if (/powershell(?:\.exe)?|pwsh(?:\.exe)?/.test(imageName) && /-enc|-encodedcommand|frombase64string|base64/.test(text)) {
    signals.push("encoded_powershell");
  }
  if (/(powershell|wscript|cscript|mshta)\.exe/.test(parentName) && /(cmd|rundll32|regsvr32)\.exe/.test(imageName)) {
    signals.push("script_interpreter_chain");
  }

  return [...new Set(signals)];
}

export function buildProcessTree(events: EndpointEvent[], caseId: string): ProcessTree[] {
  const eventsByHost = new Map<string, EndpointEvent[]>();
  for (const event of events) {
    eventsByHost.set(event.host, [...(eventsByHost.get(event.host) ?? []), event]);
  }

  return [...eventsByHost.entries()].map(([host, hostEvents]) => {
    const sortedEvents = [...hostEvents].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const nodes = new Map<string, ProcessNode>();
    const warnings: string[] = [];

    for (const event of sortedEvents) {
      const explicitParent = event.parentProcessGuid ? sortedEvents.find((candidate) => candidate.processGuid === event.parentProcessGuid) : undefined;
      const imageParent = explicitParent ?? parentByImage(event, sortedEvents);
      const parentGuid = explicitParent?.processGuid ?? imageParent?.processGuid ?? event.parentProcessGuid;
      if ((event.parentProcessGuid || event.parentImage) && !imageParent && !explicitParent) {
        warnings.push(`Parent process not found for ${event.processGuid} (${event.image}).`);
      }

      nodes.set(event.processGuid, {
        processGuid: event.processGuid,
        image: event.image,
        commandLine: event.commandLine,
        parentGuid,
        eventIds: [event.id],
        riskSignals: childRiskSignals(event, imageParent),
        children: []
      });
    }

    for (const node of nodes.values()) {
      if (!node.parentGuid) {
        continue;
      }
      const parent = nodes.get(node.parentGuid);
      if (parent) {
        parent.children.push(node);
        parent.riskSignals = mergeSignals(parent.riskSignals, node.riskSignals);
      }
    }

    const roots = [...nodes.values()]
      .filter((node) => !node.parentGuid || !nodes.has(node.parentGuid))
      .sort((a, b) => a.image.localeCompare(b.image));

    return {
      id: createId("process_tree"),
      caseId,
      host,
      roots,
      warnings: [...new Set(warnings)],
      createdAt: nowIso()
    };
  });
}
