import { describe, expect, it } from "vitest";
import { generateReport } from "../../apps/api/src/services/report-service";

describe("report service", () => {
  it("generates the required markdown sections", () => {
    const report = generateReport({
      title: "Suspicious PowerShell Execution",
      severity: "high",
      confidence: 0.82,
      category: "execution",
      summary: "Encoded PowerShell was observed.",
      evidence: ["Event ID 4688 shows powershell.exe execution."],
      recommendedActions: ["Collect process tree."],
      indicators: [],
      timeline: [],
      notes: []
    });

    expect(report).toContain("## Overview");
    expect(report).toContain("## Severity");
    expect(report).toContain("## Findings");
    expect(report).toContain("## Timeline");
    expect(report).toContain("## Indicators");
    expect(report).toContain("## Recommended Actions");
    expect(report).toContain("## Notes");
  });
});
