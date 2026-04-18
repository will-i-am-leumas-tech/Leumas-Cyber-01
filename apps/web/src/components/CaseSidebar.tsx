import type { CaseListItem } from "../types";
import { SeverityBadge } from "./SeverityBadge";

interface CaseSidebarProps {
  cases: CaseListItem[];
  selectedCaseId?: string;
  onSelect: (caseId: string) => void;
  onRefresh: () => void;
}

export function CaseSidebar({ cases, selectedCaseId, onSelect, onRefresh }: CaseSidebarProps): JSX.Element {
  return (
    <aside className="case-sidebar">
      <div className="sidebar-header">
        <div>
          <p className="eyebrow">Cases</p>
          <h1>Leumas Cyber</h1>
        </div>
        <button className="icon-button" type="button" onClick={onRefresh} aria-label="Refresh cases">
          R
        </button>
      </div>

      <img className="signal-map" src="/signal-map.svg" alt="Network signal map" />

      <nav className="soc-nav" aria-label="SOC workspace navigation">
        <button type="button" onClick={() => (window.location.hash = "/queue")}>
          Queue
        </button>
        <button type="button" onClick={() => (window.location.hash = "/admin")}>
          Admin
        </button>
      </nav>

      <div className="case-list">
        {cases.length === 0 ? (
          <p className="muted">No cases yet.</p>
        ) : (
          cases.map((cyberCase) => (
            <button
              className={`case-item ${selectedCaseId === cyberCase.id ? "active" : ""}`}
              key={cyberCase.id}
              type="button"
              onClick={() => onSelect(cyberCase.id)}
            >
              <span>{cyberCase.title}</span>
              <small>{new Date(cyberCase.updatedAt).toLocaleString()}</small>
              <small>
                {cyberCase.state} · {cyberCase.priority}
              </small>
              <SeverityBadge severity={cyberCase.severity} />
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
