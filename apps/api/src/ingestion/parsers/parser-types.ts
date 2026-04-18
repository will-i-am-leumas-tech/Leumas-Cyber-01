import type { Entity, NormalizedEvent, ParserWarning } from "../../schemas/ingest.schema";
import type { EvidenceSource } from "../../schemas/ingestion.schema";

export interface EvidenceParserInput {
  source: EvidenceSource;
  artifactId: string;
  text?: string;
  json?: unknown;
}

export interface EvidenceParserResult {
  events: NormalizedEvent[];
  entities: Entity[];
  warnings: ParserWarning[];
  recordsSeen: number;
}

export interface EvidenceParser {
  id: string;
  parse(input: EvidenceParserInput): EvidenceParserResult;
}
