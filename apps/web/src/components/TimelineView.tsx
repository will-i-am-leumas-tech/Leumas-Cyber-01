import type { TimelineEvent } from "../types";

interface TimelineViewProps {
  events: TimelineEvent[];
}

export function TimelineView({ events }: TimelineViewProps): JSX.Element {
  if (events.length === 0) {
    return <p className="muted">No timestamped events were extracted.</p>;
  }

  return (
    <ol className="timeline">
      {events.map((event, index) => (
        <li key={`${event.timestamp}-${index}`}>
          <time>{new Date(event.timestamp).toLocaleString()}</time>
          <span>{event.label}</span>
        </li>
      ))}
    </ol>
  );
}
