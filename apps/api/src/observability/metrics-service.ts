import type { OperationalMetric } from "../schemas/observability.schema";
import { nowIso } from "../utils/time";

function labelKey(labels: Record<string, string>): string {
  return Object.keys(labels)
    .sort()
    .map((key) => `${key}=${labels[key]}`)
    .join(",");
}

export class MetricsService {
  private readonly counters = new Map<string, OperationalMetric>();

  increment(name: string, labels: Record<string, string> = {}, value = 1): OperationalMetric {
    const key = `${name}{${labelKey(labels)}}`;
    const existing = this.counters.get(key);
    const metric: OperationalMetric = {
      name,
      value: (existing?.value ?? 0) + value,
      labels,
      timestamp: nowIso()
    };
    this.counters.set(key, metric);
    return metric;
  }

  snapshot(): OperationalMetric[] {
    return [...this.counters.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
}
