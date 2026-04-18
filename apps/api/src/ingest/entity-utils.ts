import type { Entity } from "../schemas/ingest.schema";

function entityId(type: Entity["type"], normalized: string): string {
  const safe = normalized.toLowerCase().replace(/[^a-z0-9_.:-]+/g, "_").slice(0, 80);
  return `entity_${type}_${safe}`;
}

export function makeEntity(type: Entity["type"], value: string): Entity {
  const normalized = type === "process" || type === "file" ? value.trim() : value.trim().toLowerCase();
  return {
    id: entityId(type, normalized),
    type,
    value,
    normalized,
    aliases: []
  };
}

export function mergeEntities(entities: Entity[]): Entity[] {
  const byId = new Map<string, Entity>();

  for (const entity of entities) {
    const existing = byId.get(entity.id);
    if (!existing) {
      byId.set(entity.id, { ...entity, aliases: [...new Set(entity.aliases)] });
      continue;
    }

    byId.set(entity.id, {
      ...existing,
      aliases: [...new Set([...existing.aliases, entity.value, ...entity.aliases].filter((alias) => alias !== existing.value))]
    });
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}
