import type { ApprovalQueueItem } from "../types";
import { groupApprovalsByStatus, pendingApprovalCount } from "../workspace/approval-view-model";

interface ApprovalQueueProps {
  approvals: ApprovalQueueItem[];
}

export function ApprovalQueue({ approvals }: ApprovalQueueProps): JSX.Element {
  const lanes = groupApprovalsByStatus(approvals);

  return (
    <section className="soc-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Approval Queue</p>
          <h2>Operator Approvals</h2>
        </div>
        <span className="task-status">{pendingApprovalCount(approvals)} pending</span>
      </div>
      <div className="approval-lanes">
        {lanes.map((lane) => (
          <section className="task-lane" key={lane.status}>
            <div className="lane-header">
              <h3>{lane.label}</h3>
              <span>{lane.items.length}</span>
            </div>
            {lane.items.length === 0 ? (
              <p className="muted">No {lane.label.toLowerCase()} approvals.</p>
            ) : (
              lane.items.map((item) => (
                <article key={item.id}>
                  <strong>{item.title}</strong>
                  <small>
                    {item.sourceType} · {item.risk} · {item.caseId}
                  </small>
                  <p>{item.reason}</p>
                </article>
              ))
            )}
          </section>
        ))}
      </div>
    </section>
  );
}
