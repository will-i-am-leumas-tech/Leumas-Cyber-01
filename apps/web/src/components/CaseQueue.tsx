import { useMemo, useState } from "react";
import type { CaseQueueItem, CaseState, Severity } from "../types";
import { filterCaseQueue, summarizeCaseQueue, type CaseQueueFilters } from "../workspace/case-queue-view-model";
import { SeverityBadge } from "./SeverityBadge";

interface CaseQueueProps {
  items: CaseQueueItem[];
  selectedCaseId?: string;
  onSelect: (caseId: string) => void;
  onRefresh?: () => void;
}

const stateOptions: Array<"" | CaseState> = ["", "new", "triaging", "investigating", "contained", "remediating", "monitoring", "closed"];
const severityOptions: Array<"" | Severity> = ["", "critical", "high", "medium", "low"];

export function CaseQueue({ items, selectedCaseId, onSelect, onRefresh }: CaseQueueProps): JSX.Element {
  const [filters, setFilters] = useState<CaseQueueFilters>({
    search: "",
    state: "",
    severity: "",
    flags: []
  });
  const filtered = useMemo(() => filterCaseQueue(items, filters), [items, filters]);
  const summary = useMemo(() => summarizeCaseQueue(items), [items]);

  return (
    <section className="soc-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SOC Queue</p>
          <h2>Case Queue</h2>
        </div>
        {onRefresh && (
          <button className="secondary-button" type="button" onClick={onRefresh}>
            Refresh
          </button>
        )}
      </div>

      <dl className="metrics queue-metrics">
        <div>
          <dt>Total</dt>
          <dd>{summary.total}</dd>
        </div>
        <div>
          <dt>Open</dt>
          <dd>{summary.open}</dd>
        </div>
        <div>
          <dt>High Priority</dt>
          <dd>{summary.highPriority}</dd>
        </div>
        <div>
          <dt>Overdue</dt>
          <dd>{summary.overdue}</dd>
        </div>
        <div>
          <dt>Approvals</dt>
          <dd>{summary.pendingApprovals}</dd>
        </div>
      </dl>

      <div className="queue-controls">
        <label>
          Search
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="case, owner, flag"
          />
        </label>
        <label>
          State
          <select value={filters.state} onChange={(event) => setFilters((current) => ({ ...current, state: event.target.value as "" | CaseState }))}>
            {stateOptions.map((state) => (
              <option key={state || "all"} value={state}>
                {state || "all"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Severity
          <select
            value={filters.severity}
            onChange={(event) => setFilters((current) => ({ ...current, severity: event.target.value as "" | Severity }))}
          >
            {severityOptions.map((severity) => (
              <option key={severity || "all"} value={severity}>
                {severity || "all"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="queue-list">
        {filtered.length === 0 ? (
          <p className="muted">No cases match the queue filters.</p>
        ) : (
          filtered.map((item) => (
            <button
              className={`queue-item ${selectedCaseId === item.caseId ? "active" : ""}`}
              key={item.caseId}
              type="button"
              onClick={() => onSelect(item.caseId)}
            >
              <span>{item.title}</span>
              <small>
                {item.caseId} · {item.state} · {item.slaStatus}
              </small>
              <div className="queue-item-footer">
                <SeverityBadge severity={item.severity} />
                <span>{item.openTaskCount} open tasks</span>
                <span>{item.approvalCount} approvals</span>
              </div>
              {item.flags.length > 0 && <small>{item.flags.join(", ")}</small>}
            </button>
          ))
        )}
      </div>
    </section>
  );
}
