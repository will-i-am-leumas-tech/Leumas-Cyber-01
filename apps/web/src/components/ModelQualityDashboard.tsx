import type { DashboardMetric, ProviderHealth, ProviderUsageSummary } from "../types";

interface ModelQualityDashboardProps {
  activeProvider: string;
  metrics: DashboardMetric[];
  providers: ProviderHealth[];
  usage: ProviderUsageSummary[];
}

function metricValue(metrics: DashboardMetric[], name: string): number {
  return metrics.find((metric) => metric.name === name)?.value ?? 0;
}

export function ModelQualityDashboard({
  activeProvider,
  metrics,
  providers,
  usage
}: ModelQualityDashboardProps): JSX.Element {
  return (
    <section className="soc-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Model Quality</p>
          <h2>{activeProvider}</h2>
        </div>
      </div>
      <dl className="metrics">
        <div>
          <dt>Provider Calls</dt>
          <dd>{metricValue(metrics, "provider_calls_total")}</dd>
        </div>
        <div>
          <dt>Failures</dt>
          <dd>{metricValue(metrics, "provider_failures_total")}</dd>
        </div>
        <div>
          <dt>Grounding Findings</dt>
          <dd>{metricValue(metrics, "grounding_findings_total")}</dd>
        </div>
        <div>
          <dt>Needs Review</dt>
          <dd>{metricValue(metrics, "grounding_findings_weak")}</dd>
        </div>
      </dl>

      <div className="dashboard-grid">
        <section className="workspace-section">
          <h3>Provider Health</h3>
          <ol className="audit-list">
            {providers.map((provider) => (
              <li key={`${provider.provider}:${provider.model}`}>
                <div>
                  <strong>{provider.provider}</strong>
                  <span>{provider.status}</span>
                </div>
                <p>
                  {provider.model} · {provider.latencyMs}ms
                </p>
              </li>
            ))}
          </ol>
        </section>
        <section className="workspace-section">
          <h3>Usage</h3>
          <ol className="audit-list">
            {usage.length === 0 ? (
              <li>
                <p className="muted">No provider usage recorded in this process.</p>
              </li>
            ) : (
              usage.map((item) => (
                <li key={`${item.provider}:${item.model}`}>
                  <div>
                    <strong>{item.provider}</strong>
                    <span>{item.calls} calls</span>
                  </div>
                  <p>
                    {item.failures} failures · {item.blocked} blocked · {item.totalTokens} tokens
                  </p>
                </li>
              ))
            )}
          </ol>
        </section>
      </div>
    </section>
  );
}
