import { describe, expect, it } from "vitest";
import { buildTimeline } from "../../apps/api/src/services/timeline-service";

describe("timeline service", () => {
  it("extracts and sorts timestamped events", () => {
    const timeline = buildTimeline(`
      2026-04-16T10:02:00Z successful login user=admin
      2026-04-16T10:00:00Z failed login user=admin
      2026-04-16T10:01:00Z failed login user=admin
    `);

    expect(timeline).toHaveLength(3);
    expect(timeline[0].timestamp).toBe("2026-04-16T10:00:00.000Z");
    expect(timeline[2].label).toContain("successful login");
  });

  it("does not convert JSON timestamp fields into malformed standalone events", () => {
    const timeline = buildTimeline(`
      {
        "timestamp": "2026-04-16T10:15:00Z",
        "event": "process_creation"
      }
      2026-04-16T10:16:00Z process_creation host=WS-42
    `);

    expect(timeline).toHaveLength(1);
    expect(timeline[0].label).toBe("process_creation host=WS-42");
  });
});
