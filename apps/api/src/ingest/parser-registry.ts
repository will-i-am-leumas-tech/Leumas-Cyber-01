import type { ArtifactWithContent } from "./artifact-service";
import type { Entity, NormalizedEvent, ParserWarning } from "../schemas/ingest.schema";
import { jsonAlertParser } from "./parsers/json-alert.parser";
import { lineLogParser } from "./parsers/line-log.parser";
import { csvParser } from "./parsers/csv.parser";
import { mergeEntities } from "./entity-utils";

export interface ParseResult {
  events: NormalizedEvent[];
  entities: Entity[];
  warnings: ParserWarning[];
}

export interface ParserAdapter {
  id: string;
  canParse(input: ArtifactWithContent): number;
  parse(input: ArtifactWithContent): ParseResult;
}

const parsers: ParserAdapter[] = [jsonAlertParser, csvParser, lineLogParser];

export function selectParser(input: ArtifactWithContent): ParserAdapter {
  const ranked = parsers
    .map((parser) => ({ parser, score: parser.canParse(input) }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score > 0 ? ranked[0].parser : lineLogParser;
}

export function parseArtifacts(inputs: ArtifactWithContent[]): ParseResult {
  const events: NormalizedEvent[] = [];
  const entities: Entity[] = [];
  const warnings: ParserWarning[] = [];

  for (const input of inputs) {
    const parser = selectParser(input);
    const parsed = parser.parse(input);
    events.push(...parsed.events);
    entities.push(...parsed.entities);
    warnings.push(...parsed.warnings);
  }

  return {
    events: events.sort((a, b) => (a.timestamp ?? "").localeCompare(b.timestamp ?? "")),
    entities: mergeEntities(entities),
    warnings
  };
}
