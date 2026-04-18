import type { IntelRelationship, IntelSource, StixObjectRecord } from "../schemas/threat-intel-v2.schema";
import { parseStixBundle } from "./stix-parser";

export interface TaxiiCollectionDescriptor {
  sourceId: string;
  collectionId: string;
  title: string;
  readOnly: true;
}

export function buildTaxiiCollectionDescriptor(source: IntelSource): TaxiiCollectionDescriptor {
  return {
    sourceId: source.id,
    collectionId: `${source.id}-collection`,
    title: source.name,
    readOnly: true
  };
}

export function importTaxiiBundle(bundle: Record<string, unknown>, source: IntelSource): {
  objects: StixObjectRecord[];
  relationships: IntelRelationship[];
} {
  return parseStixBundle(bundle, source);
}
