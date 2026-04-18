import type { IntelGraph, IntelRelationship, StixObjectRecord } from "../schemas/threat-intel-v2.schema";

function labelForRecord(record: StixObjectRecord): string {
  return record.name ?? record.indicatorValue ?? record.stixId;
}

function nodeFromRecord(record: StixObjectRecord): IntelGraph["nodes"][number] {
  return {
    id: record.id,
    type: record.type,
    label: labelForRecord(record),
    confidence: record.decayedConfidence,
    sourceId: record.sourceId
  };
}

export function buildRelationshipGraph(
  objectId: string,
  objects: StixObjectRecord[],
  relationships: IntelRelationship[]
): IntelGraph {
  const objectById = new Map(objects.flatMap((object) => [[object.id, object], [object.stixId, object]]));
  const root = objectById.get(objectId);
  const matchedEdges = relationships.filter(
    (relationship) => relationship.sourceObjectId === objectId || relationship.targetObjectId === objectId
  );
  const neighborIds = matchedEdges.flatMap((relationship) => [relationship.sourceObjectId, relationship.targetObjectId]);
  const nodeIds = new Set([objectId, ...neighborIds]);
  const nodes = [...nodeIds]
    .map((id) => objectById.get(id))
    .filter((record): record is StixObjectRecord => Boolean(record))
    .map(nodeFromRecord);

  return {
    objectId,
    nodes: root && !nodes.some((node) => node.id === root.id) ? [nodeFromRecord(root), ...nodes] : nodes,
    edges: matchedEdges.map((relationship) => ({
      id: relationship.id,
      sourceObjectId: relationship.sourceObjectId,
      targetObjectId: relationship.targetObjectId,
      relationshipType: relationship.relationshipType,
      confidence: relationship.confidence,
      evidence: relationship.evidence
    })),
    citations: matchedEdges.flatMap((relationship) => relationship.evidence)
  };
}
