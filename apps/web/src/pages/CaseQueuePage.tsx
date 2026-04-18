import { useEffect, useState } from "react";
import { listCaseQueue } from "../api/client";
import { CaseQueue } from "../components/CaseQueue";
import type { CaseQueueItem } from "../types";

export function CaseQueuePage(): JSX.Element {
  const [items, setItems] = useState<CaseQueueItem[]>([]);
  const [error, setError] = useState<string | undefined>();

  async function refresh(): Promise<void> {
    setError(undefined);
    setItems(await listCaseQueue());
  }

  useEffect(() => {
    refresh().catch((caught) => {
      setError(caught instanceof Error ? caught.message : "Unable to load case queue");
    });
  }, []);

  return (
    <main className="soc-page">
      <nav className="soc-nav top-nav" aria-label="SOC workspace navigation">
        <button type="button" onClick={() => (window.location.hash = "/")}>
          Intake
        </button>
        <button type="button" onClick={() => (window.location.hash = "/admin")}>
          Admin
        </button>
      </nav>
      {error && <div className="error-banner workspace-error">{error}</div>}
      <CaseQueue
        items={items}
        onRefresh={() => {
          refresh().catch((caught) => {
            setError(caught instanceof Error ? caught.message : "Unable to refresh case queue");
          });
        }}
        onSelect={(caseId) => {
          window.location.hash = `/cases/${encodeURIComponent(caseId)}`;
        }}
      />
    </main>
  );
}
