import { useMemo, useState } from "react";
import {
  createReportDraft,
  createReportRedaction,
  createCaseNote,
  createTask,
  updateCaseState,
  updateReportDraft,
  updateTaskStatus
} from "../api/client";
import { AnalystNotes } from "../components/AnalystNotes";
import { ApprovalQueue } from "../components/ApprovalQueue";
import { AuditView } from "../components/AuditView";
import { CitationInspector } from "../components/CitationInspector";
import { EntityGraph } from "../components/EntityGraph";
import { EvidencePanel } from "../components/EvidencePanel";
import { ReportEditor } from "../components/ReportEditor";
import { ResultTabs } from "../components/ResultTabs";
import { SeverityBadge } from "../components/SeverityBadge";
import { TaskBoard } from "../components/TaskBoard";
import { WorkspaceTimeline } from "../components/WorkspaceTimeline";
import type { AnalystNote, ApprovalQueueItem, CaseState, CyberCase, ReportAudience, ReportStatus, TaskStatus, WorkflowPriority } from "../types";
import { buildWorkspaceStats } from "../workspace/view-model";

type WorkspaceTab = "overview" | "evidence" | "timeline" | "workflow" | "collaboration" | "report" | "deep-data";

interface CaseWorkspacePageProps {
  cyberCase: CyberCase;
  onCaseUpdated: (cyberCase: CyberCase) => void;
  onNewAnalysis: () => void;
}

const workspaceTabs: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "evidence", label: "Evidence" },
  { id: "timeline", label: "Timeline" },
  { id: "workflow", label: "Workflow" },
  { id: "collaboration", label: "Collaboration" },
  { id: "report", label: "Report" },
  { id: "deep-data", label: "Deep Data" }
];

const stateOptions: CaseState[] = ["new", "triaging", "investigating", "contained", "remediating", "monitoring", "closed"];

export function CaseWorkspacePage({ cyberCase, onCaseUpdated, onNewAnalysis }: CaseWorkspacePageProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [stateReason, setStateReason] = useState("Workspace state update.");
  const stats = useMemo(() => buildWorkspaceStats(cyberCase), [cyberCase]);
  const findings = cyberCase.result?.reasoning?.findings ?? [];
  const approvalQueueItems = useMemo<ApprovalQueueItem[]>(
    () =>
      cyberCase.approvalRequests.map((approval) => {
        const plan = cyberCase.actionPlans.find((candidate) => candidate.id === approval.actionPlanId);
        return {
          id: approval.id,
          caseId: cyberCase.id,
          title: plan?.objective ?? cyberCase.title,
          sourceType: "action",
          targetId: approval.actionPlanId,
          risk: plan?.risk ?? "medium",
          status: approval.status,
          approver: approval.decidedBy ?? approval.approverRole,
          reason: approval.reason,
          createdAt: approval.createdAt
        };
      }),
    [cyberCase]
  );

  async function runMutation(action: () => Promise<CyberCase>): Promise<void> {
    setBusy(true);
    setError(undefined);
    try {
      onCaseUpdated(await action());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Workspace update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="workspace-page">
      <div className="workspace-header">
        <div>
          <p className="eyebrow">Case Workspace</p>
          <h2>{cyberCase.title}</h2>
          <p className="workspace-subtitle">
            {cyberCase.id} · {cyberCase.mode} · updated {new Date(cyberCase.updatedAt).toLocaleString()}
          </p>
        </div>
        <div className="workspace-header-actions">
          <SeverityBadge severity={cyberCase.severity} />
          <button className="secondary-button" type="button" onClick={onNewAnalysis}>
            New Analysis
          </button>
        </div>
      </div>

      {error && <div className="error-banner workspace-error">{error}</div>}

      <div className="workspace-layout">
        <div className="workspace-main">
          <dl className="metrics workspace-metrics">
            <div>
              <dt>State</dt>
              <dd>{cyberCase.state}</dd>
            </div>
            <div>
              <dt>Findings</dt>
              <dd>{stats.findingCount}</dd>
            </div>
            <div>
              <dt>Evidence</dt>
              <dd>{stats.evidenceCount}</dd>
            </div>
            <div>
              <dt>Entities</dt>
              <dd>{stats.entityCount}</dd>
            </div>
            <div>
              <dt>Events</dt>
              <dd>{stats.eventCount}</dd>
            </div>
            <div>
              <dt>Open Tasks</dt>
              <dd>{stats.openTaskCount}</dd>
            </div>
          </dl>

          <div className="workspace-tabs" role="tablist" aria-label="Case workspace sections">
            {workspaceTabs.map((tab) => (
              <button
                key={tab.id}
                className={activeTab === tab.id ? "active" : ""}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="workspace-content">
            {activeTab === "overview" && (
              <div className="stack">
                <section className="workspace-section">
                  <h3>Summary</h3>
                  <p>{cyberCase.summary}</p>
                  {cyberCase.refusal && <p className="refusal">{cyberCase.refusal.safeRedirect}</p>}
                </section>

                <section className="workspace-section">
                  <h3>Recommended Actions</h3>
                  <ul className="action-list">
                    {cyberCase.recommendations.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                </section>

                <section className="workspace-section">
                  <h3>Case State</h3>
                  <div className="state-update">
                    <label>
                      State
                      <select
                        value={cyberCase.state}
                        disabled={busy}
                        onChange={(event) => {
                          const nextState = event.target.value as CaseState;
                          void runMutation(() => updateCaseState(cyberCase.id, nextState, stateReason));
                        }}
                      >
                        {stateOptions.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Reason
                      <input value={stateReason} onChange={(event) => setStateReason(event.target.value)} />
                    </label>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "evidence" && (
              <div className="stack">
                <EvidencePanel cyberCase={cyberCase} />
                <CitationInspector cyberCase={cyberCase} />
                <EntityGraph cyberCase={cyberCase} />
              </div>
            )}

            {activeTab === "timeline" && <WorkspaceTimeline events={cyberCase.result?.timeline ?? []} />}

            {activeTab === "workflow" && (
              <div className="stack">
                <TaskBoard
                  busy={busy}
                  tasks={cyberCase.tasks}
                  findings={findings}
                  onCreateTask={(input: {
                    title: string;
                    description?: string;
                    owner?: string;
                    priority?: WorkflowPriority;
                    linkedFindingIds?: string[];
                    required?: boolean;
                  }) => runMutation(() => createTask(cyberCase.id, input))}
                  onUpdateTaskStatus={(taskId: string, status: TaskStatus) =>
                    runMutation(() => updateTaskStatus(cyberCase.id, taskId, status))
                  }
                />
                <ApprovalQueue approvals={approvalQueueItems} />
              </div>
            )}

            {activeTab === "collaboration" && (
              <AnalystNotes
                busy={busy}
                notes={cyberCase.analystNotes ?? []}
                onCreate={(input: { author: string; text: string; mentions: string[]; visibility: AnalystNote["visibility"] }) =>
                  runMutation(async () => (await createCaseNote(cyberCase.id, input)).case)
                }
              />
            )}

            {activeTab === "report" && (
              <ReportEditor
                busy={busy}
                cyberCase={cyberCase}
                onCreateDraft={(templateId?: string) => runMutation(() => createReportDraft(cyberCase.id, templateId))}
                onSaveDraft={(reportId: string, input: { contentMarkdown: string; status: ReportStatus; diffSummary: string }) =>
                  runMutation(() => updateReportDraft(cyberCase.id, reportId, input))
                }
                onCreateRedaction={(reportId: string, audience: ReportAudience) =>
                  runMutation(() => createReportRedaction(cyberCase.id, reportId, audience))
                }
              />
            )}

            {activeTab === "deep-data" && <ResultTabs cyberCase={cyberCase} />}
          </div>
        </div>

        <aside className="workspace-rail" aria-label="Safety and audit">
          <section>
            <h3>Provider</h3>
            {cyberCase.providerCalls.length === 0 ? (
              <p className="muted">No provider call recorded.</p>
            ) : (
              cyberCase.providerCalls.slice(-2).map((call) => {
                const validation = cyberCase.structuredOutputValidations.find((item) => item.providerCallId === call.id);
                return (
                  <article key={call.id}>
                    <strong>
                      {call.provider} · {call.status}
                    </strong>
                    <p>
                      {call.model} · {call.latencyMs}ms · {call.tokens.totalTokens} tokens
                    </p>
                    <small>{validation ? `${validation.schemaName}: ${validation.status}` : call.promptVersion}</small>
                  </article>
                );
              })
            )}
          </section>

          <section>
            <h3>Safety</h3>
            {cyberCase.safetyDecisions.length === 0 ? (
              <p className="muted">No safety decision recorded.</p>
            ) : (
              cyberCase.safetyDecisions.slice(-3).map((decision) => (
                <article key={decision.id}>
                  <strong>{decision.allowed ? "Allowed" : "Blocked"}</strong>
                  <p>{decision.reason}</p>
                  <small>
                    {decision.layer} · {decision.policyVersion}
                  </small>
                </article>
              ))
            )}
          </section>

          <section>
            <h3>Audit Trail</h3>
            <AuditView entries={cyberCase.auditEntries.slice(-6)} />
          </section>
        </aside>
      </div>
    </section>
  );
}
