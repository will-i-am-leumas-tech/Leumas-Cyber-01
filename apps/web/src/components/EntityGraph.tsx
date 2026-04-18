import { useMemo, useState } from "react";
import type { CyberCase } from "../types";
import { buildEntityGraph, type EntityGraphFilters } from "../workspace/view-model";
import { EvidenceGraphControls } from "./EvidenceGraphControls";

interface EntityGraphProps {
  cyberCase: CyberCase;
}

export function EntityGraph({ cyberCase }: EntityGraphProps): JSX.Element {
  const [filters, setFilters] = useState<EntityGraphFilters>({ query: "", types: [] });
  const graph = useMemo(() => buildEntityGraph(cyberCase, filters), [cyberCase, filters]);

  if (graph.nodes.length === 0) {
    return (
      <div className="stack">
        <EvidenceGraphControls filters={filters} onChange={setFilters} />
        <p className="muted">No entity graph is available for this case.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <EvidenceGraphControls filters={filters} onChange={setFilters} />
      <div className="entity-graph" aria-label="Entity graph">
        <div className="graph-node-grid">
          {graph.nodes.map((node) => (
            <div className={`graph-node graph-node-${node.type}`} key={node.id}>
              <strong>{node.label}</strong>
              <small>
                {node.type} · {node.meta}
              </small>
              <span>{node.weight}</span>
            </div>
          ))}
        </div>

        <div className="graph-edge-list">
          <h3>Relationships</h3>
          {graph.edges.length === 0 ? (
            <p className="muted">No entity relationships were extracted.</p>
          ) : (
            <ol className="audit-list">
              {graph.edges.slice(0, 16).map((edge) => {
                const from = graph.nodes.find((node) => node.id === edge.from);
                const to = graph.nodes.find((node) => node.id === edge.to);
                return (
                  <li key={edge.id}>
                    <div>
                      <strong>{edge.label}</strong>
                    </div>
                    <p>
                      {from?.label ?? edge.from} to {to?.label ?? edge.to}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
