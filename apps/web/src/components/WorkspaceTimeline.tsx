import type { TimelineEvent } from "../types";
import { TimelineExplorer } from "./TimelineExplorer";

interface WorkspaceTimelineProps {
  events: TimelineEvent[];
}

export function WorkspaceTimeline({ events }: WorkspaceTimelineProps): JSX.Element {
  return <TimelineExplorer events={events} />;
}
