import { useEffect, useState } from "react";
import { getModelQualityDashboard, listApprovals } from "../api/client";
import { ApprovalQueue } from "../components/ApprovalQueue";
import { ModelQualityDashboard } from "../components/ModelQualityDashboard";
import type { ApprovalQueueItem, DashboardMetric, ProviderHealth, ProviderUsageSummary } from "../types";

interface DashboardData {
  activeProvider: string;
  providers: ProviderHealth[];
  usage: ProviderUsageSummary[];
  metrics: DashboardMetric[];
}

export function AdminDashboardPage(): JSX.Element {
  const [dashboard, setDashboard] = useState<DashboardData | undefined>();
  const [approvals, setApprovals] = useState<ApprovalQueueItem[]>([]);
  const [error, setError] = useState<string | undefined>();

  async function refresh(): Promise<void> {
    setError(undefined);
    const [nextDashboard, nextApprovals] = await Promise.all([getModelQualityDashboard(), listApprovals(true)]);
    setDashboard(nextDashboard);
    setApprovals(nextApprovals);
  }

  useEffect(() => {
    refresh().catch((caught) => {
      setError(caught instanceof Error ? caught.message : "Unable to load admin dashboard");
    });
  }, []);

  return (
    <main className="soc-page">
      <nav className="soc-nav top-nav" aria-label="SOC workspace navigation">
        <button type="button" onClick={() => (window.location.hash = "/")}>
          Intake
        </button>
        <button type="button" onClick={() => (window.location.hash = "/queue")}>
          Queue
        </button>
      </nav>
      <div className="workspace-header">
        <div>
          <p className="eyebrow">SOC Admin</p>
          <h1>Operational Dashboard</h1>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            refresh().catch((caught) => {
              setError(caught instanceof Error ? caught.message : "Unable to refresh admin dashboard");
            });
          }}
        >
          Refresh
        </button>
      </div>
      {error && <div className="error-banner workspace-error">{error}</div>}
      <div className="stack">
        {dashboard ? (
          <ModelQualityDashboard
            activeProvider={dashboard.activeProvider}
            metrics={dashboard.metrics}
            providers={dashboard.providers}
            usage={dashboard.usage}
          />
        ) : (
          <p className="muted">Loading model quality data.</p>
        )}
        <ApprovalQueue approvals={approvals} />
      </div>
    </main>
  );
}
