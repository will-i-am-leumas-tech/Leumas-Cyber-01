import { createHash } from "node:crypto";
import type { EndpointEvent } from "../schemas/endpoint.schema";
import { createId } from "../utils/ids";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function stableProcessGuid(host: string, timestamp: string, image: string, commandLine: string, index: number): string {
  const digest = createHash("sha256").update([host, timestamp, image, commandLine, index].join("|")).digest("hex").slice(0, 16);
  return `proc_${digest}`;
}

function basename(value: string): string {
  return value.split(/[\\/]/).pop()?.toLowerCase() ?? value.toLowerCase();
}

function lineValue(line: string, key: string): string | undefined {
  const match = new RegExp(`\\b${key}=("([^"]+)"|(.+?))(?=\\s+[A-Za-z_][A-Za-z0-9_]*=|$)`, "i").exec(line);
  return (match?.[2] ?? match?.[3])?.trim();
}

function riskSignalsForEvent(image: string, commandLine = "", parentImage = ""): string[] {
  const imageName = basename(image);
  const parentName = basename(parentImage);
  const text = `${image} ${commandLine}`.toLowerCase();
  const signals: string[] = [];
  if (/powershell(?:\.exe)?|pwsh(?:\.exe)?/.test(imageName) && /-enc|-encodedcommand|frombase64string|base64/.test(text)) {
    signals.push("encoded_powershell");
  }
  if (/(winword|excel|outlook|powerpnt)\.exe/.test(parentName) && /(powershell|cmd|wscript|cscript|mshta)\.exe/.test(imageName)) {
    signals.push("office_spawned_interpreter");
  }
  if (/(powershell|wscript|cscript|mshta)\.exe/.test(parentName) && /(cmd|rundll32|regsvr32)\.exe/.test(imageName)) {
    signals.push("script_interpreter_child_process");
  }
  return signals;
}

export function normalizeEndpointLogText(text: string, caseId?: string): EndpointEvent[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const timestamp = line.match(/^\S+/)?.[0] ?? new Date().toISOString();
      const host = lineValue(line, "host") ?? "unknown-host";
      const image = lineValue(line, "image") ?? "unknown-image";
      const commandLine = lineValue(line, "command_line") ?? lineValue(line, "commandLine") ?? image;
      const parentImage = lineValue(line, "parent");
      const processGuid = lineValue(line, "process_guid") ?? lineValue(line, "processGuid") ?? stableProcessGuid(host, timestamp, image, commandLine, index);

      return {
        id: createId("endpoint_event"),
        caseId,
        host,
        user: lineValue(line, "user"),
        timestamp,
        eventType: lineValue(line, "event_id") ? `windows_event_${lineValue(line, "event_id")}` : "process_event",
        processGuid,
        image,
        commandLine,
        parentProcessGuid: lineValue(line, "parent_process_guid") ?? lineValue(line, "parentProcessGuid"),
        parentImage,
        file: lineValue(line, "file"),
        registry: lineValue(line, "registry"),
        network: {
          srcIp: lineValue(line, "src"),
          dstIp: lineValue(line, "dst"),
          dstPort: lineValue(line, "dpt") ?? lineValue(line, "dstPort")
        },
        sourceRef: `endpoint-log:line:${index + 1}`,
        riskSignals: riskSignalsForEvent(image, commandLine, parentImage)
      };
    });
}

export function normalizeEndpointEvents(rawEvents: unknown[], caseId?: string): EndpointEvent[] {
  return rawEvents.map((raw, index) => {
    const event = asRecord(raw);
    const host = asString(event.host ?? event.hostname ?? event.asset, "unknown-host");
    const timestamp = asString(event.timestamp ?? event.time, new Date().toISOString());
    const image = asString(event.image ?? asRecord(event.process).image, "unknown-image");
    const commandLine = asString(event.commandLine ?? event.command_line ?? asRecord(event.process).commandLine, image);
    const parentImage = asString(event.parentImage ?? event.parent_image ?? asRecord(event.parentProcess).image, "");
    const processGuid = asString(event.processGuid ?? event.process_guid, stableProcessGuid(host, timestamp, image, commandLine, index));
    const network = asRecord(event.network);

    return {
      id: createId("endpoint_event"),
      caseId,
      host,
      user: asString(event.user ?? event.actor, ""),
      timestamp,
      eventType: asString(event.eventType ?? event.event_type, "process_event"),
      processGuid,
      image,
      commandLine,
      parentProcessGuid: asString(event.parentProcessGuid ?? event.parent_process_guid, ""),
      parentImage,
      file: asString(event.file, ""),
      registry: asString(event.registry, ""),
      network: {
        srcIp: asString(network.srcIp ?? network.src_ip, ""),
        dstIp: asString(network.dstIp ?? network.dst_ip, ""),
        dstPort: asString(network.dstPort ?? network.dst_port, "")
      },
      sourceRef: `endpoint-json:${index + 1}`,
      riskSignals: riskSignalsForEvent(image, commandLine, parentImage)
    };
  });
}
