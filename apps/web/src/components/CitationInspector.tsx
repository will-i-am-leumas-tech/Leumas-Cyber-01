import type { CitationQuality, CyberCase } from "../types";

interface CitationInspectorProps {
  cyberCase: CyberCase;
}

function qualityFor(cyberCase: CyberCase, chunkId: string): CitationQuality | undefined {
  const resultQuality = cyberCase.result?.knowledge?.results.find((result) => result.chunkId === chunkId)?.citationQuality;
  return resultQuality ?? (cyberCase.knowledgeCitationQualities ?? []).find((quality) => quality.citationId === chunkId);
}

export function CitationInspector({ cyberCase }: CitationInspectorProps): JSX.Element {
  const results = cyberCase.result?.knowledge?.results ?? [];

  return (
    <section className="workspace-section citation-inspector">
      <h3>Citation Inspector</h3>
      {results.length === 0 ? (
        <p className="muted">No knowledge citations were attached to this case.</p>
      ) : (
        <ol className="audit-list">
          {results.map((result) => {
            const quality = qualityFor(cyberCase, result.chunkId);
            return (
              <li key={result.chunkId}>
                <div>
                  <strong>{result.citation.title}</strong>
                  <span>{result.citation.trustTier}</span>
                </div>
                <p>{result.excerpt}</p>
                <small>
                  {result.citation.location} · version {result.citation.version}
                </small>
                {quality && (
                  <dl className="detail-list compact-detail-list">
                    <div>
                      <dt>Relevance</dt>
                      <dd>{quality.relevance.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt>Freshness</dt>
                      <dd>{quality.freshness.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt>Trust</dt>
                      <dd>{quality.trust.toFixed(2)}</dd>
                    </div>
                  </dl>
                )}
                {quality?.warnings.map((warning) => (
                  <p className="source-warning" key={warning}>
                    {warning}
                  </p>
                ))}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
