import type { Entity, NormalizedEvent, ParserWarning } from "../../schemas/ingest.schema";
import type { EvidenceParser } from "./parser-types";
import { addEntity, field, normalizeTimestamp, sourceRef } from "./parser-helpers";

const timestampPattern = /^\S+/;

function severityForDns(action: string | undefined, domain: string | undefined): NormalizedEvent["severity"] {
  if (action?.toLowerCase() === "blocked") {
    return "high";
  }
  if (domain && /\b(?:login|verify|mfa|token|credential)\b/i.test(domain)) {
    return "medium";
  }
  return "low";
}

export const dnsParser: EvidenceParser = {
  id: "dns-parser",

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
      const clientIp = field(line, ["client_ip", "client", "src", "src_ip"]);
      const domain = field(line, ["domain", "query", "qname"]);
      const responseIp = field(line, ["response_ip", "answer", "dst", "dst_ip"]);
      const qtype = field(line, ["qtype", "type"]);
      const action = field(line, ["action", "verdict"]);

      if (!domain && !clientIp) {
        warnings.push({
          parserId: dnsParser.id,
          sourceRef: sourceRef({ artifactId: input.artifactId, parserId: dnsParser.id, lineNumber: index + 1, excerpt: line }),
          message: "DNS record did not include a domain or client IP.",
          severity: "warning" as const
        });
        continue;
      }

      const entityIds = [
        addEntity(entities, "ip", clientIp),
        addEntity(entities, "domain", domain),
        addEntity(entities, "ip", responseIp)
      ].filter((value): value is string => Boolean(value));

      events.push({
        id: `event_${input.source.id.slice(-8)}_${String(events.length + 1).padStart(3, "0")}`,
        timestamp,
        source: input.source.name,
        eventType: "dns_query",
        severity: severityForDns(action, domain),
        actor: clientIp,
        asset: domain,
        network: {
          srcIp: clientIp,
          dstIp: responseIp
        },
        process: {
          commandLine: qtype ? `qtype=${qtype}` : undefined
        },
        entityIds,
        rawRef: sourceRef({ artifactId: input.artifactId, parserId: dnsParser.id, lineNumber: index + 1, excerpt: line })
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
