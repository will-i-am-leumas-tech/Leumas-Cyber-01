import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { analyzeAlertOrLogs } from "../../apps/api/src/adapters/log-analyzer.adapter";
import { attachReport } from "../../apps/api/src/adapters/report-generator.adapter";
import { buildCyberReasoningV2 } from "../../apps/api/src/reasoning/cyber-reasoning-engine";
import { buildReasoningBundle } from "../../apps/api/src/reasoning/reasoning-service";
import type { AnalysisResult } from "../../apps/api/src/schemas/result.schema";

function buildReasonedResult(result: Omit<AnalysisResult, "reasoning">): AnalysisResult {
  const reasoning = buildReasoningBundle(
    {
      ...result,
      notes: result.notes ?? []
    },
    []
  );
  return {
    ...result,
    reasoning
  };
}

describe("cyber reasoning engine v2", () => {
  it("builds hypothesis graph, unknown records, and technique mappings from evidence", async () => {
    const alert = await readFile("data/fixtures/alerts/powershell-encoded.json", "utf8");
    const adapterResult = attachReport(analyzeAlertOrLogs(alert, "alert"));
    const result = buildReasonedResult(adapterResult);
    const reasoningV2 = buildCyberReasoningV2({
      result,
      reasoning: result.reasoning!
    });

    expect(reasoningV2.hypothesisNodes[0]).toMatchObject({
      title: expect.stringContaining("execution"),
      status: "supported"
    });
    expect(reasoningV2.unknownRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          priority: "high",
          suggestedSource: expect.stringContaining("telemetry")
        })
      ])
    );
    expect(reasoningV2.techniqueMappings[0]).toMatchObject({
      framework: "MITRE ATT&CK",
      tactic: "Execution",
      techniqueId: "T1059"
    });
  });

  it("detects contradictions when high severity conflicts with authorized maintenance evidence", async () => {
    const result = JSON.parse(await readFile("data/fixtures/reasoning/contradictory-evidence-v2.json", "utf8")) as AnalysisResult;
    const reasoned = buildReasonedResult(result);
    const reasoningV2 = buildCyberReasoningV2({
      result: reasoned,
      reasoning: reasoned.reasoning!
    });

    expect(reasoningV2.contradictions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conflictType: "source_conflict",
          severity: "high"
        })
      ])
    );
  });
});
