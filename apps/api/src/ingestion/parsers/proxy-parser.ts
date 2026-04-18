import type { Entity, NormalizedEvent, ParserWarning } from "../../schemas/ingest.schema";
import type { EvidenceParser } from "./parser-types";
import { addEntity, field, normalizeTimestamp, sourceRef, urlHostname } from "./parser-helpers";

const timestampPattern = /^\S+/;

function severityForProxy(action: string | undefined, category: string | undefined, status: string | undefined): NormalizedEvent["severity"] {
  if (action?.toLowerCase() === "blocked" || category?.toLowerCase().includes("malware")) {
    return "high";
  }
  if (status && Number(status) >= 500) {
    return "medium";
  }
  return "low";
}

export const proxyParser: EvidenceParser = {
  id: "proxy-parser",

  parse(input) {
    const text = input.text ?? "";
    const events: NormalizedEvent[] = [];
    const entities: Entity[] = [];
    const warnings: ParserWarning[] = [];
    let recordsSeen = 0;

    for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }

      recordsSeen += 1;
      const timestamp = normalizeTimestamp(line.match(timestampPattern)?.[0]);
      const user = field(line, ["user", "username", "actor"]);
      const srcIp = field(line, ["src", "src_ip", "client_ip"]);
      const url = field(line, ["url", "uri"]);
      const domain = field(line, ["dst_domain", "domain", "host"]) ?? urlHostname(url);
      const method = field(line, ["method"]);
      const status = field(line, ["status", "status_code"]);
      const category = field(line, ["category"]);
      const action = field(line, ["action", "verdict"]);

      if (!url && !domain) {
        warnings.push({
          parserId: proxyParser.id,
          sourceRef: sourceRef({ artifactId: input.artifactId, parserId: proxyParser.id, lineNumber: index + 1, excerpt: line }),
          message: "Proxy record did not include a URL or destination domain.",
          severity: "warning"
        });
        continue;
      }

      const entityIds = [
        addEntity(entities, "user", user),
        addEntity(entities, "ip", srcIp),
        addEntity(entities, "domain", domain)
      ].filter((value): value is string => Boolean(value));

      events.push({
        id: `event_${input.source.id.slice(-8)}_${String(events.length + 1).padStart(3, "0")}`,
        timestamp,
        source: input.source.name,
        eventType: "proxy_request",
        severity: severityForProxy(action, category, status),
        actor: user,
        asset: domain,
        network: {
          srcIp
        },
        process: {
          commandLine: [method, status ? `status=${status}` : undefined, url].filter(Boolean).join(" ")
        },
        entityIds,
        rawRef: sourceRef({ artifactId: input.artifactId, parserId: proxyParser.id, lineNumber: index + 1, excerpt: line })
      });
    }

    return {
      events,
      entities,
      warnings,
      recordsSeen
    };
  }
};
