import { useMemo, useState } from "react";
import type { CyberCase } from "../types";
import { AuditView } from "./AuditView";
import { SeverityBadge } from "./SeverityBadge";
import { TimelineView } from "./TimelineView";

type Tab =
  | "summary"
  | "evidence"
  | "reasoning"
  | "safety"
  | "validation"
  | "vulnerabilities"
  | "cloud"
  | "endpoint"
  | "intel"
  | "agents"
  | "privacy"
  | "detections"
  | "workflow"
  | "timeline"
  | "recommendations"
  | "audit"
  | "report";

interface ResultTabsProps {
  cyberCase?: CyberCase;
}

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "summary", label: "Summary" },
  { id: "evidence", label: "Evidence" },
  { id: "reasoning", label: "Reasoning" },
  { id: "safety", label: "Safety" },
  { id: "validation", label: "Validation" },
  { id: "vulnerabilities", label: "Vulns" },
  { id: "cloud", label: "Cloud" },
  { id: "endpoint", label: "Endpoint" },
  { id: "intel", label: "Intel" },
  { id: "agents", label: "Agents" },
  { id: "privacy", label: "Privacy" },
  { id: "detections", label: "Detections" },
  { id: "workflow", label: "Workflow" },
  { id: "timeline", label: "Timeline" },
  { id: "recommendations", label: "Recommendations" },
  { id: "audit", label: "Audit" },
  { id: "report", label: "Report" }
];

export function ResultTabs({ cyberCase }: ResultTabsProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const result = cyberCase?.result;
  const refusal = cyberCase?.refusal;
  const reasoning = result?.reasoning;
  const knowledge = result?.knowledge;
  const ingestion = result?.ingestion;

  const indicators = useMemo(() => result?.indicators ?? [], [result]);
  const observationsById = useMemo(
    () => new Map((reasoning?.observations ?? []).map((observation) => [observation.id, observation])),
    [reasoning]
  );
  const agentRoleById = useMemo(
    () => new Map((cyberCase?.agentRoles ?? []).map((role) => [role.id, role])),
    [cyberCase]
  );
  const agentResultByTaskId = useMemo(
    () => new Map((cyberCase?.agentResults ?? []).map((agentResult) => [agentResult.taskId, agentResult])),
    [cyberCase]
  );

  if (!cyberCase) {
    return (
      <section className="result-panel empty-state">
        <p className="eyebrow">Result</p>
        <h2>Run an analysis</h2>
        <p className="muted">Cases, findings, timelines, recommendations, and audit entries will appear here.</p>
      </section>
    );
  }

  return (
    <section className="result-panel">
      <div className="result-header">
        <div>
          <p className="eyebrow">Result</p>
          <h2>{cyberCase.title}</h2>
        </div>
        <SeverityBadge severity={cyberCase.severity} />
      </div>

      <div className="tab-list" role="tablist" aria-label="Analysis result sections">
        {tabs.map((tab) => (
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

      <div className="tab-content">
        {activeTab === "summary" && (
          <div className="stack">
            <p>{cyberCase.summary}</p>
            {result && (
              <dl className="metrics">
                <div>
                  <dt>Category</dt>
                  <dd>{result.category}</dd>
                </div>
                <div>
                  <dt>Confidence</dt>
                  <dd>{Math.round(result.confidence * 100)}%</dd>
                </div>
                <div>
                  <dt>Indicators</dt>
                  <dd>{indicators.length}</dd>
                </div>
                <div>
                  <dt>Findings</dt>
                  <dd>{reasoning?.findings.length ?? 0}</dd>
                </div>
                <div>
                  <dt>Sources</dt>
                  <dd>{knowledge?.results.length ?? 0}</dd>
                </div>
                <div>
                  <dt>Events</dt>
                  <dd>{ingestion?.normalizedEvents.length ?? 0}</dd>
                </div>
                <div>
                  <dt>State</dt>
                  <dd>{cyberCase.state}</dd>
                </div>
                <div>
                  <dt>Detections</dt>
                  <dd>{cyberCase.detectionRules.length}</dd>
                </div>
                <div>
                  <dt>Reports</dt>
                  <dd>{cyberCase.reportDrafts.length}</dd>
                </div>
                <div>
                  <dt>Safety</dt>
                  <dd>{cyberCase.safetyDecisions.length}</dd>
                </div>
                <div>
                  <dt>Validation</dt>
                  <dd>{cyberCase.validationCampaigns.length}</dd>
                </div>
                <div>
                  <dt>Vulns</dt>
                  <dd>{cyberCase.vulnerabilityFindings.length}</dd>
                </div>
                <div>
                  <dt>Cloud</dt>
                  <dd>{cyberCase.cloudEvents.length}</dd>
                </div>
                <div>
                  <dt>Endpoint</dt>
                  <dd>{cyberCase.endpointEvents.length}</dd>
                </div>
                <div>
                  <dt>Intel</dt>
                  <dd>{cyberCase.indicatorEnrichments.length}</dd>
                </div>
                <div>
                  <dt>Agents</dt>
                  <dd>{cyberCase.agentTasks.length}</dd>
                </div>
                <div>
                  <dt>Privacy</dt>
                  <dd>{cyberCase.sensitiveFindings.length}</dd>
                </div>
              </dl>
            )}
            {knowledge?.warnings.map((warning) => <p className="source-warning" key={warning}>{warning}</p>)}
            {refusal && <p className="refusal">{refusal.safeRedirect}</p>}
          </div>
        )}

        {activeTab === "evidence" && (
          <div className="stack">
            <h3>Evidence</h3>
            <ul>{(result?.evidence ?? []).map((item) => <li key={item}>{item}</li>)}</ul>
            {reasoning && (
              <>
                <h3>Source-Linked Observations</h3>
                <div className="reasoning-list">
                  {reasoning.observations
                    .filter((observation) => observation.type === "fact" || observation.type === "timeline_event")
                    .map((observation) => (
                      <article key={observation.id}>
                        <strong>{observation.type.replace("_", " ")}</strong>
                        <p>{observation.value}</p>
                        <small>
                          {Math.round(observation.confidence * 100)}% confidence · {observation.sourceRef.locator}
                        </small>
                      </article>
                    ))}
                </div>
              </>
            )}
            <h3>Indicators</h3>
            {indicators.length === 0 ? (
              <p className="muted">No indicators extracted.</p>
            ) : (
              <div className="indicator-table">
                {indicators.map((indicator) => (
                  <div key={`${indicator.type}-${indicator.normalized}`}>
                    <span>{indicator.type}</span>
                    <code>{indicator.normalized}</code>
                  </div>
                ))}
              </div>
            )}
            {knowledge && (
              <>
                <h3>Knowledge Sources</h3>
                <div className="reasoning-list">
                  {knowledge.results.map((retrievalResult) => (
                    <article key={retrievalResult.chunkId}>
                      <strong>{retrievalResult.citation.title}</strong>
                      <p>{retrievalResult.excerpt}</p>
                      <small>
                        {retrievalResult.citation.location} · {retrievalResult.citation.trustTier} · v
                        {retrievalResult.citation.version}
                        {retrievalResult.citation.stale ? " · stale" : ""}
                      </small>
                    </article>
                  ))}
                </div>
              </>
            )}
            {ingestion && (
              <>
                <h3>Normalized Events</h3>
                {ingestion.normalizedEvents.length === 0 ? (
                  <p className="muted">No normalized events were extracted.</p>
                ) : (
                  <div className="event-table">
                    {ingestion.normalizedEvents.slice(0, 8).map((event) => (
                      <div key={event.id}>
                        <span>{event.eventType}</span>
                        <span>{event.timestamp ? new Date(event.timestamp).toLocaleString() : "No timestamp"}</span>
                        <code>{event.rawRef.lineNumber ? `line ${event.rawRef.lineNumber}` : event.rawRef.jsonPointer ?? event.rawRef.parserId}</code>
                      </div>
                    ))}
                  </div>
                )}
                <h3>Entities</h3>
                {ingestion.entities.length === 0 ? (
                  <p className="muted">No entities were normalized.</p>
                ) : (
                  <div className="indicator-table">
                    {ingestion.entities.slice(0, 12).map((entity) => (
                      <div key={entity.id}>
                        <span>{entity.type}</span>
                        <code>{entity.normalized}</code>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "reasoning" && (
          <div className="stack">
            {!reasoning ? (
              <p className="muted">No structured reasoning bundle was generated.</p>
            ) : (
              <>
                <h3>Findings</h3>
                <div className="reasoning-list">
                  {reasoning.findings.map((finding) => (
                    <article key={finding.id}>
                      <div className="reasoning-row">
                        <strong>{finding.title}</strong>
                        <SeverityBadge severity={finding.severity} />
                      </div>
                      <p>{finding.reasoningSummary}</p>
                      <small>
                        {Math.round(finding.confidence * 100)}% confidence · evidence{" "}
                        {finding.evidenceObservationIds.join(", ")}
                      </small>
                      {finding.evidenceObservationIds.map((observationId) => {
                        const observation = observationsById.get(observationId);
                        return observation ? <p key={observationId} className="linked-evidence">{observation.value}</p> : null;
                      })}
                    </article>
                  ))}
                </div>

                <h3>Hypotheses</h3>
                <div className="reasoning-list">
                  {reasoning.hypotheses.map((hypothesis) => (
                    <article key={hypothesis.id}>
                      <strong>{hypothesis.title}</strong>
                      <p>{hypothesis.reasoningSummary}</p>
                      <small>
                        {hypothesis.status} · {Math.round(hypothesis.confidence * 100)}% confidence
                      </small>
                    </article>
                  ))}
                </div>

                <h3>Assumptions</h3>
                <ul>{reasoning.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>

                <h3>Unknowns</h3>
                <ul>{reasoning.unknowns.map((item) => <li key={item}>{item}</li>)}</ul>

                <h3>Reasoning Runs</h3>
                <div className="reasoning-list">
                  {reasoning.reasoningRuns.map((run) => (
                    <article key={run.id}>
                      <strong>{run.provider}</strong>
                      <p>{run.validationSummary}</p>
                      <small>
                        {run.validationStatus} · {run.promptVersion}
                      </small>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "detections" && (
          <div className="stack">
            <h3>Detection Intents</h3>
            {cyberCase.detectionIntents.length === 0 ? (
              <p className="muted">No detection intents generated.</p>
            ) : (
              <div className="reasoning-list">
                {cyberCase.detectionIntents.map((intent) => (
                  <article key={intent.id}>
                    <div className="reasoning-row">
                      <strong>{intent.behavior}</strong>
                      <SeverityBadge severity={intent.severity} />
                    </div>
                    <p>{intent.dataSources.join(", ")}</p>
                    <small>
                      {intent.category} · evidence {intent.evidenceRefs.length}
                    </small>
                  </article>
                ))}
              </div>
            )}

            <h3>Detection Rules</h3>
            {cyberCase.detectionRules.length === 0 ? (
              <p className="muted">No detection rules generated.</p>
            ) : (
              <div className="reasoning-list">
                {cyberCase.detectionRules.map((rule) => (
                  <article key={rule.id}>
                    <div className="reasoning-row">
                      <strong>{rule.title}</strong>
                      <span className={`task-status task-${rule.validationStatus === "failed" ? "blocked" : "done"}`}>
                        {rule.validationStatus}
                      </span>
                    </div>
                    <p>{rule.logic.description}</p>
                    <small>
                      {rule.logic.logsource.product}/{rule.logic.logsource.category} · {rule.coverage.tactic} ·{" "}
                      {Math.round(rule.coverage.confidence * 100)}% coverage confidence
                    </small>
                    <pre className="rule-export">{rule.query}</pre>
                  </article>
                ))}
              </div>
            )}

            <h3>Validation Results</h3>
            {cyberCase.ruleValidationResults.length === 0 ? (
              <p className="muted">No rule validation results recorded.</p>
            ) : (
              <ol className="audit-list">
                {cyberCase.ruleValidationResults.map((validation) => (
                  <li key={validation.id}>
                    <div>
                      <strong>{validation.passed ? "passed" : "failed"}</strong>
                      <time>{new Date(validation.createdAt).toLocaleString()}</time>
                    </div>
                    <p>
                      Schema {validation.schemaStatus}, fixtures {validation.fixtureStatus}.{" "}
                      {validation.warnings.length > 0 ? validation.warnings.join(" ") : "No warnings."}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {activeTab === "safety" && (
          <div className="stack">
            <h3>Safety Decisions</h3>
            {cyberCase.safetyDecisions.length === 0 ? (
              <p className="muted">No safety decisions recorded.</p>
            ) : (
              <div className="reasoning-list">
                {cyberCase.safetyDecisions.map((decision) => (
                  <article key={decision.id}>
                    <div className="reasoning-row">
                      <strong>{decision.category}</strong>
                      <span className={`task-status task-${decision.allowed ? "done" : "blocked"}`}>
                        {decision.allowed ? "allowed" : "blocked"}
                      </span>
                    </div>
                    <p>{decision.reason}</p>
                    <small>
                      {decision.layer} · {decision.policyVersion} · signals {decision.matchedSignals.length}
                    </small>
                  </article>
                ))}
              </div>
            )}

            <h3>Prompt-Injection Warnings</h3>
            {cyberCase.promptInjectionFindings.length === 0 ? (
              <p className="muted">No prompt-injection patterns flagged.</p>
            ) : (
              <div className="reasoning-list">
                {cyberCase.promptInjectionFindings.map((finding) => (
                  <article key={finding.id}>
                    <div className="reasoning-row">
                      <strong>{finding.pattern}</strong>
                      <span className={`task-status task-${finding.risk === "high" ? "blocked" : "open"}`}>{finding.risk}</span>
                    </div>
                    <p>{finding.mitigation}</p>
                    <small>{finding.sourceRef}</small>
                  </article>
                ))}
              </div>
            )}

            <h3>Output Safety</h3>
            {cyberCase.outputSafetyResults.length === 0 ? (
              <p className="muted">No provider output safety results recorded.</p>
            ) : (
              <ol className="audit-list">
                {cyberCase.outputSafetyResults.map((result) => (
                  <li key={result.id}>
                    <div>
                      <strong>{result.allowed ? "passed" : "blocked"}</strong>
                      <time>{new Date(result.createdAt).toLocaleString()}</time>
                    </div>
                    <p>
                      {result.blockedSegments.length > 0 ? result.blockedSegments.join(", ") : "No blocked segments."}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {activeTab === "validation" && (
          <div className="stack">
            <h3>Authorization Scopes</h3>
            {cyberCase.authorizationScopes.length === 0 ? (
              <p className="muted">No case-linked validation scopes recorded.</p>
            ) : (
              <div className="reasoning-list">
                {cyberCase.authorizationScopes.map((scope) => (
                  <article key={scope.id}>
                    <strong>{scope.name}</strong>
                    <p>{scope.assets.join(", ")}</p>
                    <small>
                      {scope.startsAt} to {scope.expiresAt} · approvers {scope.approvers.join(", ")}
                    </small>
                  </article>
                ))}
              </div>
            )}

            <h3>Campaigns</h3>
            {cyberCase.validationCampaigns.length === 0 ? (
              <p className="muted">No case-linked validation campaigns recorded.</p>
            ) : (
              <div className="reasoning-list">
                {cyberCase.validationCampaigns.map((campaign) => (
                  <article key={campaign.id}>
                    <div className="reasoning-row">
                      <strong>{campaign.objective}</strong>
                      <span className={`task-status task-${campaign.status === "blocked" ? "blocked" : "done"}`}>
                        {campaign.status}
                      </span>
                    </div>
                    <p>{campaign.controlsUnderTest.join(", ")}</p>
                    <small>{campaign.safetyWarnings.join(" ") || "Scope current."}</small>
                  </article>
                ))}
              </div>
            )}

            <h3>Telemetry Expectations</h3>
            {cyberCase.telemetryExpectations.length === 0 ? (
              <p className="muted">No case-linked telemetry expectations recorded.</p>
            ) : (
              <div className="event-table">
                {cyberCase.telemetryExpectations.map((expectation) => (
                  <div key={expectation.id}>
                    <span>{expectation.dataSource}</span>
                    <span>{expectation.expectedEventType}</span>
                    <code>{expectation.detectionRuleRef ?? "No rule ref"}</code>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "vulnerabilities" && (
          <div className="stack">
            <h3>Prioritized Findings</h3>
            {cyberCase.vulnerabilityFindings.length === 0 ? (
              <p className="muted">No case-linked vulnerability findings recorded.</p>
            ) : (
              <div className="reasoning-list">
                {cyberCase.vulnerabilityFindings.map((finding) => (
                  <article key={finding.id}>
                    <div className="reasoning-row">
                      <strong>
                        {finding.cve} · {finding.assetName}
                      </strong>
                      <SeverityBadge severity={finding.priority} />
                    </div>
                    <p>{finding.title}</p>
                    <small>
                      Score {finding.riskScore} · {finding.riskSummary}
                    </small>
                  </article>
                ))}
              </div>
            )}

            <h3>Remediation Queue</h3>
            {cyberCase.vulnerabilityRemediationTasks.length === 0 ? (
              <p className="muted">No case-linked vulnerability remediation tasks recorded.</p>
            ) : (
              <ol className="audit-list">
                {cyberCase.vulnerabilityRemediationTasks.map((task) => (
                  <li key={task.id}>
                    <div>
                      <strong>{task.status}</strong>
                      <time>{new Date(task.dueDate).toLocaleDateString()}</time>
                    </div>
                    <p>
                      {task.owner} · {task.validationMethod}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {activeTab === "cloud" && (
          <div className="stack">
            <h3>Cloud And Identity Events</h3>
            {cyberCase.cloudEvents.length === 0 ? (
              <p className="muted">No cloud or identity events linked to this case.</p>
            ) : (
              <div className="event-table">
                {cyberCase.cloudEvents.slice(0, 10).map((event) => (
                  <div key={event.id}>
                    <span>{event.provider}</span>
                    <span>{event.action}</span>
                    <code>
                      {event.actor} · {event.resource}
                    </code>
                  </div>
                ))}
              </div>
            )}

            <h3>Posture Findings</h3>
            {cyberCase.postureFindings.length === 0 ? (
              <p className="muted">No posture findings recorded.</p>
            ) : (
              <div className="reasoning-list">
                {cyberCase.postureFindings.map((finding) => (
                  <article key={finding.id}>
                    <div className="reasoning-row">
                      <strong>{finding.control}</strong>
                      <SeverityBadge severity={finding.severity} />
                    </div>
                    <p>{finding.remediation}</p>
                    <small>
                      {finding.status} · evidence {finding.evidenceRefs.join(", ")}
                    </small>
                  </article>
                ))}
              </div>
            )}

            <h3>Permission Risks</h3>
            {cyberCase.permissionRisks.length === 0 ? (
              <p className="muted">No permission risks recorded.</p>
            ) : (
              <div className="reasoning-list">
                {cyberCase.permissionRisks.map((risk) => (
                  <article key={risk.id}>
                    <div className="reasoning-row">
                      <strong>{risk.principalId}</strong>
                      <SeverityBadge severity={risk.severity} />
                    </div>
                    <p>{risk.recommendation}</p>
                    <small>
                      {risk.riskyPermission} · {risk.exposure}
                    </small>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "endpoint" && (
          <div className="stack">
            <h3>Process Trees</h3>
            {cyberCase.processTrees.length === 0 ? (
              <p className="muted">No process trees built.</p>
            ) : (
              <div className="reasoning-list">
                {cyberCase.processTrees.map((tree) => (
                  <article key={tree.id}>
                    <strong>{tree.host}</strong>
                    <p>
                      {tree.roots.length} root process{tree.roots.length === 1 ? "" : "es"} ·{" "}
                      {tree.warnings.length} warning{tree.warnings.length === 1 ? "" : "s"}
                    </p>
                    <small>
                      {tree.roots
                        .map((root) => `${root.image} (${root.children.length} child${root.children.length === 1 ? "" : "ren"})`)
                        .join("; ")}
                    </small>
                  </article>
                ))}
              </div>
            )}

            <h3>Forensic Timeline</h3>
            {cyberCase.forensicTimeline.length === 0 ? (
              <p className="muted">No forensic timeline events recorded.</p>
            ) : (
              <ol className="audit-list">
                {cyberCase.forensicTimeline.slice(0, 12).map((event) => (
                  <li key={event.id}>
                    <div>
                      <strong>{event.eventType}</strong>
                      <time>{new Date(event.timestamp).toLocaleString()}</time>
                    </div>
                    <p>
                      {event.host} · {event.summary}
                    </p>
                  </li>
                ))}
              </ol>
            )}

            <h3>Collection Checklist</h3>
            {cyberCase.forensicArtifacts.length === 0 ? (
              <p className="muted">No forensic artifact checklist recorded.</p>
            ) : (
              <div className="reasoning-list">
                {cyberCase.forensicArtifacts.map((artifact) => (
                  <article key={artifact.id}>
                    <div className="reasoning-row">
                      <strong>{artifact.type}</strong>
                      <span className={`task-status task-${artifact.collected ? "done" : "open"}`}>
                        {artifact.collected ? "collected" : "needed"}
                      </span>
                    </div>
                    <p>{artifact.source}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "intel" && (
          <div className="stack">
            <h3>Indicator Enrichment</h3>
            {cyberCase.indicatorEnrichments.length === 0 ? (
              <p className="muted">No threat intelligence enrichment recorded.</p>
            ) : (
              <div className="reasoning-list">
                {cyberCase.indicatorEnrichments.map((enrichment) => (
                  <article key={enrichment.id}>
                    <div className="reasoning-row">
                      <strong>{enrichment.indicatorValue}</strong>
                      <span className={`task-status task-${enrichment.verdict === "malicious" ? "blocked" : "done"}`}>
                        {enrichment.verdict}
                      </span>
                    </div>
                    <p>{enrichment.tags.join(", ") || "No tags"}</p>
                    <small>
                      {enrichment.sourceId} · {Math.round(enrichment.confidence * 100)}% confidence
                    </small>
                  </article>
                ))}
              </div>
            )}

            <h3>Threat Context</h3>
            {cyberCase.threatContextSummaries.length === 0 ? (
              <p className="muted">No threat context summaries recorded.</p>
            ) : (
              <div className="reasoning-list">
                {cyberCase.threatContextSummaries.map((summary) => (
                  <article key={summary.id}>
                    <strong>{summary.defensiveSummary}</strong>
                    <p>{summary.recommendedHandling.join(" ")}</p>
                    <small>{summary.relatedBehaviors.join(", ") || "No related behavior tags"}</small>
                  </article>
                ))}
              </div>
            )}

            <h3>Internal Sightings</h3>
            {cyberCase.internalSightings.length === 0 ? (
              <p className="muted">No case-linked internal sightings recorded.</p>
            ) : (
              <ol className="audit-list">
                {cyberCase.internalSightings.map((sighting) => (
                  <li key={sighting.id}>
                    <div>
                      <strong>{sighting.asset}</strong>
                      <time>{new Date(sighting.timestamp).toLocaleString()}</time>
                    </div>
                    <p>
                      {sighting.source} · {sighting.eventRef}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {activeTab === "agents" && (
          <div className="stack">
            <dl className="metrics">
              <div>
                <dt>Roles</dt>
                <dd>{cyberCase.agentRoles.length}</dd>
              </div>
              <div>
                <dt>Runs</dt>
                <dd>{cyberCase.orchestrationRuns.length}</dd>
              </div>
              <div>
                <dt>Tasks</dt>
                <dd>{cyberCase.agentTasks.length}</dd>
              </div>
              <div>
                <dt>Validated</dt>
                <dd>{cyberCase.agentResults.filter((agentResult) => agentResult.validationStatus === "passed").length}</dd>
              </div>
            </dl>

            <h3>Orchestration Runs</h3>
            {cyberCase.orchestrationRuns.length === 0 ? (
              <p className="muted">No agent orchestration runs recorded.</p>
            ) : (
              <ol className="audit-list">
                {cyberCase.orchestrationRuns.map((run) => (
                  <li key={run.id}>
                    <div>
                      <strong>{run.finalStatus}</strong>
                      <time>{new Date(run.createdAt).toLocaleString()}</time>
                    </div>
                    <p>
                      {run.plan} · {run.taskIds.length} task{run.taskIds.length === 1 ? "" : "s"}
                    </p>
                  </li>
                ))}
              </ol>
            )}

            <h3>Agent Tasks</h3>
            {cyberCase.agentTasks.length === 0 ? (
              <p className="muted">No bounded specialist tasks have run.</p>
            ) : (
              <div className="reasoning-list">
                {cyberCase.agentTasks.map((task) => {
                  const role = agentRoleById.get(task.role);
                  const agentResult = agentResultByTaskId.get(task.id);
                  const taskClass =
                    task.status === "blocked" || task.status === "failed"
                      ? "blocked"
                      : task.status === "completed"
                        ? "done"
                        : "open";

                  return (
                    <article key={task.id}>
                      <div className="reasoning-row">
                        <strong>{role?.displayName ?? task.role}</strong>
                        <span className={`task-status task-${taskClass}`}>{task.status}</span>
                      </div>
                      <p>{role?.description ?? "Bounded specialist agent task."}</p>
                      <small>
                        {task.expectedSchema} · timeout {Math.round(task.timeoutMs / 1000)}s · validation{" "}
                        {agentResult?.validationStatus ?? "pending"}
                      </small>
                      {agentResult && (
                        <>
                          <small>
                            Confidence {Math.round(agentResult.confidence * 100)}%
                            {agentResult.warnings.length > 0 ? ` · ${agentResult.warnings.join(" ")}` : ""}
                          </small>
                          <pre className="rule-export">{JSON.stringify(agentResult.output, null, 2)}</pre>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            )}

            <h3>Arbitration</h3>
            {cyberCase.arbitrationResults.length === 0 ? (
              <p className="muted">No arbitration results recorded.</p>
            ) : (
              <div className="reasoning-list">
                {cyberCase.arbitrationResults.map((arbitration) => (
                  <article key={arbitration.id}>
                    <div className="reasoning-row">
                      <strong>{arbitration.validationStatus}</strong>
                      <span className={`task-status task-${arbitration.validationStatus === "passed" ? "done" : "blocked"}`}>
                        {arbitration.conflicts.length} conflict{arbitration.conflicts.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p>{arbitration.reviewerNotes}</p>
                    <small>
                      Selected findings {arbitration.selectedFindingIds.join(", ") || "none"} ·{" "}
                      {new Date(arbitration.createdAt).toLocaleString()}
                    </small>
                    {arbitration.conflicts.length > 0 && <ul>{arbitration.conflicts.map((conflict) => <li key={conflict}>{conflict}</li>)}</ul>}
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "privacy" && (
          <div className="stack">
            <dl className="metrics">
              <div>
                <dt>Findings</dt>
                <dd>{cyberCase.sensitiveFindings.length}</dd>
              </div>
              <div>
                <dt>Redactions</dt>
                <dd>{cyberCase.redactedArtifacts.length}</dd>
              </div>
              <div>
                <dt>Prompt Packages</dt>
                <dd>{cyberCase.promptPackages.length}</dd>
              </div>
              <div>
                <dt>Classification</dt>
                <dd>{cyberCase.dataClassifications[0]?.dataClass ?? "internal"}</dd>
              </div>
            </dl>

            <h3>Sensitive Findings</h3>
            {cyberCase.sensitiveFindings.length === 0 ? (
              <p className="muted">No sensitive values matched the MVP privacy detector.</p>
            ) : (
              <div className="reasoning-list">
                {cyberCase.sensitiveFindings.map((finding) => (
                  <article key={finding.id}>
                    <div className="reasoning-row">
                      <strong>{finding.type}</strong>
                      <span className="task-status task-blocked">{finding.redactionValue}</span>
                    </div>
                    <p>
                      {finding.sourceRef} · {finding.length} character{finding.length === 1 ? "" : "s"} · fingerprint{" "}
                      {finding.fingerprintHash}
                    </p>
                    <small>{Math.round(finding.confidence * 100)}% confidence</small>
                  </article>
                ))}
              </div>
            )}

            <h3>Prompt Minimization</h3>
            {cyberCase.promptPackages.length === 0 ? (
              <p className="muted">No provider prompt package recorded.</p>
            ) : (
              <div className="reasoning-list">
                {cyberCase.promptPackages.map((promptPackage) => (
                  <article key={promptPackage.id}>
                    <div className="reasoning-row">
                      <strong>{promptPackage.provider}</strong>
                      <span className={`task-status task-${promptPackage.mode === "redact" ? "done" : "open"}`}>
                        {promptPackage.mode}
                      </span>
                    </div>
                    <p>{promptPackage.minimizedFields.join(", ") || "No fields minimized."}</p>
                    <small>
                      Excluded findings {promptPackage.excludedFindingIds.length} · prompt hash{" "}
                      {promptPackage.promptHash.slice(0, 12)}
                    </small>
                  </article>
                ))}
              </div>
            )}

            <h3>Data Classification</h3>
            {cyberCase.dataClassifications.length === 0 ? (
              <p className="muted">No data classification records available.</p>
            ) : (
              <ol className="audit-list">
                {cyberCase.dataClassifications.map((classification) => (
                  <li key={classification.id}>
                    <div>
                      <strong>{classification.dataClass}</strong>
                      <time>{new Date(classification.createdAt).toLocaleString()}</time>
                    </div>
                    <p>
                      {classification.resourceRef} · {classification.reason}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {activeTab === "workflow" && (
          <div className="stack">
            <dl className="metrics">
              <div>
                <dt>State</dt>
                <dd>{cyberCase.state}</dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd>{cyberCase.priority}</dd>
              </div>
              <div>
                <dt>Tasks</dt>
                <dd>{cyberCase.tasks.length}</dd>
              </div>
            </dl>

            <h3>Tasks</h3>
            <div className="reasoning-list">
              {cyberCase.tasks.map((task) => (
                <article key={task.id}>
                  <div className="reasoning-row">
                    <strong>{task.title}</strong>
                    <span className={`task-status task-${task.status}`}>{task.status}</span>
                  </div>
                  {task.description && <p>{task.description}</p>}
                  <small>
                    {task.priority} priority · {task.required ? "required" : "optional"}
                    {task.owner ? ` · owner ${task.owner}` : ""}
                  </small>
                </article>
              ))}
            </div>

            <h3>Decisions</h3>
            {cyberCase.decisions.length === 0 ? (
              <p className="muted">No decisions recorded.</p>
            ) : (
              <div className="reasoning-list">
                {cyberCase.decisions.map((decision) => (
                  <article key={decision.id}>
                    <strong>{decision.decision}</strong>
                    <p>{decision.rationale}</p>
                    <small>
                      {decision.decisionType} · {decision.approver} · {new Date(decision.timestamp).toLocaleString()}
                    </small>
                  </article>
                ))}
              </div>
            )}

            <h3>Transitions</h3>
            <ol className="audit-list">
              {cyberCase.workflowTransitions.map((transition) => (
                <li key={transition.id}>
                  <div>
                    <strong>
                      {transition.from} to {transition.to}
                    </strong>
                    <time>{new Date(transition.timestamp).toLocaleString()}</time>
                  </div>
                  <p>{transition.reason}</p>
                </li>
              ))}
            </ol>

            <h3>Tool Calls</h3>
            {cyberCase.toolCalls.length === 0 ? (
              <p className="muted">No tool calls recorded.</p>
            ) : (
              <div className="reasoning-list">
                {cyberCase.toolCalls.map((toolCall) => (
                  <article key={toolCall.id}>
                    <div className="reasoning-row">
                      <strong>
                        {toolCall.connectorId} · {toolCall.operation}
                      </strong>
                      <span className={`task-status task-${toolCall.status === "denied" ? "blocked" : "done"}`}>
                        {toolCall.status}
                      </span>
                    </div>
                    <p>{toolCall.summary}</p>
                    <small>
                      {toolCall.actor} · {new Date(toolCall.timestamp).toLocaleString()} · params {toolCall.parametersHash.slice(0, 12)}
                    </small>
                  </article>
                ))}
              </div>
            )}

            <h3>Action Plans</h3>
            {cyberCase.actionPlans.length === 0 ? (
              <p className="muted">No action plans prepared.</p>
            ) : (
              <div className="reasoning-list">
                {cyberCase.actionPlans.map((plan) => (
                  <article key={plan.id}>
                    <div className="reasoning-row">
                      <strong>{plan.objective}</strong>
                      <span className={`task-status task-${plan.status === "blocked" ? "blocked" : "done"}`}>{plan.status}</span>
                    </div>
                    <p>{plan.expectedOutcome}</p>
                    <small>
                      {plan.risk} risk · {plan.steps.length} step{plan.steps.length === 1 ? "" : "s"}
                    </small>
                  </article>
                ))}
              </div>
            )}

            <h3>Action Executions</h3>
            {cyberCase.actionExecutions.length === 0 ? (
              <p className="muted">No action executions recorded.</p>
            ) : (
              <ol className="audit-list">
                {cyberCase.actionExecutions.map((execution) => (
                  <li key={execution.id}>
                    <div>
                      <strong>{execution.status}</strong>
                      <time>{new Date(execution.timestamp).toLocaleString()}</time>
                    </div>
                    <p>{execution.result}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {activeTab === "timeline" && <TimelineView events={result?.timeline ?? []} />}

        {activeTab === "recommendations" && (
          <ul className="action-list">
            {cyberCase.recommendations.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        )}

        {activeTab === "audit" && <AuditView entries={cyberCase.auditEntries} />}

        {activeTab === "report" && (
          <div className="stack">
            <h3>Report Templates</h3>
            <div className="indicator-table">
              {cyberCase.reportTemplates.map((template) => (
                <div key={template.id}>
                  <span>{template.audience}</span>
                  <code>
                    {template.name} · {template.requiredSections.length} required sections
                  </code>
                </div>
              ))}
            </div>

            <h3>Report Drafts</h3>
            {cyberCase.reportDrafts.length === 0 ? (
              <p className="muted">No report drafts created.</p>
            ) : (
              <div className="reasoning-list">
                {cyberCase.reportDrafts.map((draft) => (
                  <article key={draft.id}>
                    <div className="reasoning-row">
                      <strong>{draft.title}</strong>
                      <span className={`task-status task-${draft.status === "draft" ? "open" : "done"}`}>{draft.status}</span>
                    </div>
                    <p>
                      {draft.audience} audience · {draft.citations.length} citation
                      {draft.citations.length === 1 ? "" : "s"}
                    </p>
                    <small>
                      Updated {new Date(draft.updatedAt).toLocaleString()} · template {draft.templateId}
                    </small>
                  </article>
                ))}
              </div>
            )}

            {cyberCase.reportVersions.length > 0 && (
              <>
                <h3>Version History</h3>
                <ol className="audit-list">
                  {cyberCase.reportVersions.map((version) => (
                    <li key={version.id}>
                      <div>
                        <strong>v{version.version}</strong>
                        <time>{new Date(version.timestamp).toLocaleString()}</time>
                      </div>
                      <p>
                        {version.editor} · {version.diffSummary}
                      </p>
                    </li>
                  ))}
                </ol>
              </>
            )}

            {cyberCase.redactionResults.length > 0 && (
              <>
                <h3>Redaction Previews</h3>
                <div className="reasoning-list">
                  {cyberCase.redactionResults.map((redaction) => (
                    <article key={redaction.id}>
                      <strong>{redaction.audience}</strong>
                      <p>
                        {redaction.redactedFields.length} field type
                        {redaction.redactedFields.length === 1 ? "" : "s"} redacted.
                      </p>
                      <small>{redaction.warnings.join(" ")}</small>
                    </article>
                  ))}
                </div>
              </>
            )}

            <h3>Markdown Export</h3>
            <pre className="report-markdown">
              {cyberCase.reportDrafts[0]?.contentMarkdown ?? cyberCase.reportMarkdown}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}
