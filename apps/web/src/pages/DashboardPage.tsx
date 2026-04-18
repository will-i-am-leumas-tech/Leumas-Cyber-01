import { useEffect, useState } from "react";
import { analyzeFile, analyzeText, getCase, listCases } from "../api/client";
import { CaseSidebar } from "../components/CaseSidebar";
import { IntakePanel } from "../components/IntakePanel";
import { ResultTabs } from "../components/ResultTabs";
import { CaseWorkspacePage } from "./CaseWorkspacePage";
import type { AnalysisMode, CaseListItem, CyberCase } from "../types";

function caseIdFromHash(): string | undefined {
  const match = window.location.hash.match(/^#\/cases\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function DashboardPage(): JSX.Element {
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [selectedCase, setSelectedCase] = useState<CyberCase | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function refreshCases(): Promise<void> {
    const nextCases = await listCases();
    setCases(nextCases);
  }

  async function selectCase(caseId: string): Promise<void> {
    setError(undefined);
    setSelectedCase(await getCase(caseId));
    window.location.hash = `/cases/${encodeURIComponent(caseId)}`;
  }

  async function runAnalyzeText(input: { mode: AnalysisMode; title?: string; text: string }): Promise<void> {
    setLoading(true);
    setError(undefined);
    try {
      const response = await analyzeText(input);
      setSelectedCase(response.case);
      window.location.hash = `/cases/${encodeURIComponent(response.case.id)}`;
      await refreshCases();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  async function runAnalyzeFile(input: { mode: AnalysisMode; title?: string; file: File }): Promise<void> {
    setLoading(true);
    setError(undefined);
    try {
      const response = await analyzeFile(input);
      setSelectedCase(response.case);
      window.location.hash = `/cases/${encodeURIComponent(response.case.id)}`;
      await refreshCases();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshCases().catch((caught) => {
      setError(caught instanceof Error ? caught.message : "Unable to load cases");
    });
  }, []);

  useEffect(() => {
    async function syncHashRoute(): Promise<void> {
      const routeCaseId = caseIdFromHash();
      if (!routeCaseId) {
        return;
      }
      setError(undefined);
      setSelectedCase(await getCase(routeCaseId));
    }

    syncHashRoute().catch((caught) => {
      setError(caught instanceof Error ? caught.message : "Unable to load case route");
    });
    const onHashChange = (): void => {
      syncHashRoute().catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Unable to load case route");
      });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <main className={`dashboard-shell ${selectedCase ? "workspace-shell" : ""}`}>
      <CaseSidebar
        cases={cases}
        selectedCaseId={selectedCase?.id}
        onSelect={(caseId) => {
          selectCase(caseId).catch((caught) => {
            setError(caught instanceof Error ? caught.message : "Unable to load case");
          });
        }}
        onRefresh={() => {
          refreshCases().catch((caught) => {
            setError(caught instanceof Error ? caught.message : "Unable to refresh cases");
          });
        }}
      />

      {selectedCase ? (
        <div className="workspace-route">
          {error && <div className="error-banner workspace-route-error">{error}</div>}
          <CaseWorkspacePage
            cyberCase={selectedCase}
            onCaseUpdated={(nextCase) => {
              setSelectedCase(nextCase);
              refreshCases().catch((caught) => {
                setError(caught instanceof Error ? caught.message : "Unable to refresh cases");
              });
            }}
            onNewAnalysis={() => {
              setSelectedCase(undefined);
              setError(undefined);
              window.location.hash = "/";
            }}
          />
        </div>
      ) : (
        <>
          <div className="work-area">
            {error && <div className="error-banner">{error}</div>}
            <IntakePanel loading={loading} onAnalyzeText={runAnalyzeText} onAnalyzeFile={runAnalyzeFile} />
          </div>

          <ResultTabs cyberCase={selectedCase} />
        </>
      )}
    </main>
  );
}
