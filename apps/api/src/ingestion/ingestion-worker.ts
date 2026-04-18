import { mergeEntities } from "../ingest/entity-utils";
import type { Entity, ParserWarning } from "../schemas/ingest.schema";
import type { EvidenceSource } from "../schemas/ingestion.schema";
import { dnsParser } from "./parsers/dns-parser";
import { emailSecurityParser } from "./parsers/email-security-parser";
import { proxyParser } from "./parsers/proxy-parser";
import type { EvidenceParser, EvidenceParserResult } from "./parsers/parser-types";

const parserAliases: Record<string, EvidenceParser> = {
  "dns-parser": dnsParser,
  "proxy-parser": proxyParser,
  "email_security-parser": emailSecurityParser,
  "email-security-parser": emailSecurityParser
};

export function listIngestionParserIds(): string[] {
  return Object.keys(parserAliases).sort();
}

export function getIngestionParser(parserId: string): EvidenceParser | null {
  return parserAliases[parserId] ?? null;
}

export function parseEvidencePayload(input: {
  source: EvidenceSource;
  artifactId: string;
  text?: string;
  json?: unknown;
}): EvidenceParserResult {
  const parser = getIngestionParser(input.source.parserId);
  if (!parser) {
    const warning: ParserWarning = {
      parserId: input.source.parserId,
      sourceRef: {
        artifactId: input.artifactId,
        parserId: input.source.parserId,
        excerpt: "unsupported parser"
      },
      message: `No ingestion parser is registered for ${input.source.parserId}.`,
      severity: "error"
    };
    return {
      events: [],
      entities: [],
      warnings: [warning],
      recordsSeen: 0
    };
  }

  const parsed = parser.parse(input);
  return {
    ...parsed,
    entities: mergeEntities(parsed.entities as Entity[])
  };
}
