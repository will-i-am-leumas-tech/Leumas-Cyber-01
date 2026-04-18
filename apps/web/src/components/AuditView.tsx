import type { AuditEntry } from "../types";

interface AuditViewProps {
  entries: AuditEntry[];
}

export function AuditView({ entries }: AuditViewProps): JSX.Element {
  if (entries.length === 0) {
    return <p className="muted">No audit entries yet.</p>;
  }

  return (
    <ol className="audit-list">
      {entries.map((entry) => (
        <li key={entry.id}>
          <div>
            <strong>{entry.action}</strong>
            <time>{new Date(entry.timestamp).toLocaleString()}</time>
          </div>
          <p>{entry.summary}</p>
        </li>
      ))}
    </ol>
  );
}
