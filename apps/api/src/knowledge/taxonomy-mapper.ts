import type { KnowledgeChunk, KnowledgeSource } from "../schemas/knowledge.schema";
import type { TaxonomyMapping } from "../schemas/knowledge-v2.schema";
import { createId } from "../utils/ids";

const mappingPatterns: Array<{ framework: TaxonomyMapping["framework"]; pattern: RegExp }> = [
  { framework: "ATTACK", pattern: /\bT\d{4}(?:\.\d{3})?\b/g },
  { framework: "CVE", pattern: /\bCVE-\d{4}-\d{4,7}\b/g },
  { framework: "CWE", pattern: /\bCWE-\d+\b/g },
  { framework: "CAPEC", pattern: /\bCAPEC-\d+\b/g },
  { framework: "D3FEND", pattern: /\bD3-[A-Z0-9-]+\b/g }
];

export function mapKnowledgeTaxonomy(target: KnowledgeSource | KnowledgeChunk): TaxonomyMapping[] {
  const text = "searchText" in target ? `${target.location}\n${target.searchText}` : `${target.title}\n${target.uri}\n${target.taxonomyTags.join(" ")}`;
  return mappingPatterns.flatMap(({ framework, pattern }) => {
    pattern.lastIndex = 0;
    return [...new Set(text.match(pattern) ?? [])].map((objectId) => ({
      id: createId("taxonomy_mapping"),
      targetRef: target.id,
      framework,
      objectId,
      confidence: 0.9
    }));
  });
}
