import { useMemo, useState } from "react";
import type { CyberCase } from "../types";
import { buildEvidenceViewModel } from "../workspace/view-model";
import { SeverityBadge } from "./SeverityBadge";

interface EvidencePanelProps {
  cyberCase: CyberCase;
}

export function EvidencePanel({ cyberCase }: EvidencePanelProps): JSX.Element {
  const viewModel = useMemo(() => buildEvidenceViewModel(cyberCase), [cyberCase]);
  const [selectedObservationId, setSelectedObservationId] = useState<string | undefined>(
    viewModel.observations[0]?.id ?? viewModel.findings[0]?.observations[0]?.id
  );
  const selectedObservation =
    viewModel.observations.find((observation) => observation.id === selectedObservationId) ??
    viewModel.findings.flatMap((finding) => finding.observations).find((observation) => observation.id === selectedObservationId);

  if (viewModel.emptyReason) {
    return <p className="muted">{viewModel.emptyReason}</p>;
  }

  return (
    <div className="evidence-workspace">
      <div className="evidence-findings">
        <h3>Findings</h3>
        <div className="reasoning-list">
          {viewModel.findings.map((finding) => (
            <article key={finding.id}>
              <div className="reasoning-row">
                <strong>{finding.title}</strong>
                <SeverityBadge severity={finding.severity} />
              </div>
              <p>{finding.summary}</p>
              <small>
                {finding.category} · {Math.round(finding.confidence * 100)}% confidence
                {finding.needsAnalystReview ? " · review" : ""}
              </small>
              <div className="evidence-links" aria-label={`Evidence for ${finding.title}`}>
                {finding.observations.length === 0 ? (
                  <span className="muted">No linked observations.</span>
                ) : (
                  finding.observations.map((observation) => (
                    <button
                      className={selectedObservation?.id === observation.id ? "active" : ""}
                      key={observation.id}
                      type="button"
                      onClick={() => setSelectedObservationId(observation.id)}
                    >
                      {observation.id}
                    </button>
                  ))
                )}
              </div>
            </article>
          ))}
        </div>
      </div>

      <aside className="evidence-inspector" aria-label="Selected evidence">
        <h3>Evidence Inspector</h3>
        {selectedObservation ? (
          <div className="stack compact-stack">
            <p>{selectedObservation.value}</p>
            <dl className="detail-list">
              <div>
                <dt>Type</dt>
                <dd>{selectedObservation.type.replace("_", " ")}</dd>
              </div>
              <div>
                <dt>Confidence</dt>
                <dd>{Math.round(selectedObservation.confidence * 100)}%</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{selectedObservation.sourceLabel}</dd>
              </div>
              {selectedObservation.timestamp && (
                <div>
                  <dt>Time</dt>
                  <dd>{new Date(selectedObservation.timestamp).toLocaleString()}</dd>
                </div>
              )}
            </dl>
            {selectedObservation.excerpt && <pre className="source-excerpt">{selectedObservation.excerpt}</pre>}
          </div>
        ) : (
          <p className="muted">Select an evidence reference.</p>
        )}

        <h3>Normalized Entities</h3>
        {viewModel.entities.length === 0 ? (
          <p className="muted">No entities were normalized.</p>
        ) : (
          <div className="entity-chip-list">
            {viewModel.entities.slice(0, 24).map((entity) => (
              <span key={entity.id} title={entity.value}>
                {entity.type}: {entity.normalized}
              </span>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
