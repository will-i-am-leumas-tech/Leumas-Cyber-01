import type { Entity, NormalizedEvent, ParserWarning } from "../../schemas/ingest.schema";
import type { EvidenceParser } from "./parser-types";
import { addEntity, normalizeTimestamp, sourceRef, urlHostname } from "./parser-helpers";

interface EmailMessageRecord {
  timestamp?: string;
  recipient?: string;
  sender?: string;
  subject?: string;
  verdict?: string;
  url?: string;
  srcIp?: string;
  messageId?: string;
}

function emailRecords(value: unknown): EmailMessageRecord[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is EmailMessageRecord => typeof item === "object" && item !== null);
  }
  if (typeof value === "object" && value !== null && Array.isArray((value as { messages?: unknown }).messages)) {
    return (value as { messages: unknown[] }).messages.filter(
      (item): item is EmailMessageRecord => typeof item === "object" && item !== null
    );
  }
  if (typeof value === "object" && value !== null) {
    return [value as EmailMessageRecord];
  }
  return [];
}

function severityForEmail(verdict: string | undefined): NormalizedEvent["severity"] {
  if (verdict && /\bmalware\b/i.test(verdict)) {
    return "critical";
  }
  if (verdict && /\b(?:phish|spoof|impersonation)\b/i.test(verdict)) {
    return "high";
  }
  return "medium";
}

export const emailSecurityParser: EvidenceParser = {
  id: "email_security-parser",

  parse(input) {
    const json = input.json ?? (input.text ? JSON.parse(input.text) : {});
    const records = emailRecords(json);
    const events: NormalizedEvent[] = [];
    const entities: Entity[] = [];
    const warnings: ParserWarning[] = [];

    records.forEach((record, index) => {
      if (!record.recipient && !record.sender && !record.subject) {
        warnings.push({
          parserId: emailSecurityParser.id,
          sourceRef: sourceRef({
            artifactId: input.artifactId,
            parserId: emailSecurityParser.id,
            jsonPointer: `/messages/${index}`,
            excerpt: JSON.stringify(record).slice(0, 240)
          }),
          message: "Email security record did not include sender, recipient, or subject.",
          severity: "warning"
        });
        return;
      }

      const urlDomain = urlHostname(record.url);
      const entityIds = [
        addEntity(entities, "user", record.sender),
        addEntity(entities, "user", record.recipient),
        addEntity(entities, "domain", urlDomain),
        addEntity(entities, "ip", record.srcIp)
      ].filter((value): value is string => Boolean(value));

      events.push({
        id: `event_${input.source.id.slice(-8)}_${String(events.length + 1).padStart(3, "0")}`,
        timestamp: normalizeTimestamp(record.timestamp),
        source: input.source.name,
        eventType: "email_security_alert",
        severity: severityForEmail(record.verdict),
        actor: record.sender,
        asset: record.recipient,
        network: {
          srcIp: record.srcIp
        },
        process: {
          commandLine: [record.verdict, record.subject, record.url].filter(Boolean).join(" | ")
        },
        entityIds,
        rawRef: sourceRef({
          artifactId: input.artifactId,
          parserId: emailSecurityParser.id,
          jsonPointer: `/messages/${index}`,
          excerpt: JSON.stringify(record).slice(0, 240)
        })
      });
    });

    return {
      events,
      entities,
      warnings,
      recordsSeen: records.length
    };
  }
};
