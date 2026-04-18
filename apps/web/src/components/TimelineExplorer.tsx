import { useMemo, useState } from "react";
import type { TimelineEvent } from "../types";
import { filterTimelineEvents } from "../workspace/view-model";
import { TimelineView } from "./TimelineView";

interface TimelineExplorerProps {
  events: TimelineEvent[];
}

type TimelineZoom = "all" | "latest20" | "latest5";

export function TimelineExplorer({ events }: TimelineExplorerProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState<TimelineZoom>("all");
  const filteredEvents = useMemo(() => {
    const matches = filterTimelineEvents(events, { query });
    if (zoom === "latest5") {
      return matches.slice(-5);
    }
    if (zoom === "latest20") {
      return matches.slice(-20);
    }
    return matches;
  }, [events, query, zoom]);

  return (
    <div className="stack">
      <div className="timeline-filter">
        <label>
          Filter timeline
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="process, user, host, source" />
        </label>
        <label>
          Zoom
          <select value={zoom} onChange={(event) => setZoom(event.target.value as TimelineZoom)}>
            <option value="all">all events</option>
            <option value="latest20">latest 20</option>
            <option value="latest5">latest 5</option>
          </select>
        </label>
        <span>
          {filteredEvents.length} of {events.length}
        </span>
      </div>
      <TimelineView events={filteredEvents} />
    </div>
  );
}
