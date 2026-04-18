import type { Severity } from "../types";

interface SeverityBadgeProps {
  severity: Severity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps): JSX.Element {
  return <span className={`severity severity-${severity}`}>{severity}</span>;
}
