import type { EntityGraphFilters, EntityGraphNode } from "../workspace/view-model";

interface EvidenceGraphControlsProps {
  filters: EntityGraphFilters;
  onChange: (filters: EntityGraphFilters) => void;
}

const graphTypes: EntityGraphNode["type"][] = ["entity", "event", "indicator", "finding"];

export function EvidenceGraphControls({ filters, onChange }: EvidenceGraphControlsProps): JSX.Element {
  function toggleType(type: EntityGraphNode["type"]): void {
    const types = filters.types.includes(type) ? filters.types.filter((item) => item !== type) : [...filters.types, type];
    onChange({ ...filters, types });
  }

  return (
    <div className="graph-controls">
      <label>
        Graph filter
        <input
          value={filters.query}
          onChange={(event) => onChange({ ...filters, query: event.target.value })}
          placeholder="entity, event, finding"
        />
      </label>
      <div className="filter-chip-row" aria-label="Graph node type filters">
        {graphTypes.map((type) => (
          <button className={filters.types.includes(type) ? "active" : ""} key={type} type="button" onClick={() => toggleType(type)}>
            {type}
          </button>
        ))}
      </div>
    </div>
  );
}
