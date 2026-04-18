import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { analyzeAlertOrLogs } from "../../apps/api/src/adapters/log-analyzer.adapter";
import { buildReasoningBundle } from "../../apps/api/src/reasoning/reasoning-service";
import { validateReasoningBundle } from "../../apps/api/src/reasoning/reasoning-validator";
import type { ReasoningBundle } from "../../apps/api/src/schemas/reasoning.schema";

describe("reasoning service", () => {
  it("builds source-linked observations and high-impact findings for encoded PowerShell", async () => {
    const alert = await readFile("data/fixtures/alerts/powershell-encoded.json", "utf8");
    const expectations = JSON.parse(await readFile("data/fixtures/reasoning/powershell-observations.json", "utf8")) as {
      requiredObservationValues: string[];
      requiredFinding: { title: string; severity: string; category: string };
    };
    const adapterResult = analyzeAlertOrLogs(alert, "alert");
    const reasoning = buildReasoningBundle(
      {
        ...adapterResult,
        notes: []
      },
      []
    );

    expect(reasoning.observations.map((observation) => observation.value)).toEqual(
      expect.arrayContaining(expectations.requiredObservationValues)
    );
    expect(reasoning.findings[0]).toMatchObject(expectations.requiredFinding);
    expect(reasoning.findings[0].evidenceObservationIds.length).toBeGreaterThan(0);
    expect(validateReasoningBundle(reasoning).valid).toBe(true);
  });

  it("builds supported hypotheses and unknowns for brute-force evidence", async () => {
    const logText = await readFile("data/fixtures/logs/auth-bruteforce.log", "utf8");
    const expectations = JSON.parse(await readFile("data/fixtures/reasoning/bruteforce-hypotheses.json", "utf8")) as {
      requiredHypothesis: { titleIncludes: string; status: string };
      requiredUnknowns: string[];
    };
    const adapterResult = analyzeAlertOrLogs(logText, "logs");
    const reasoning = buildReasoningBundle(
      {
        ...adapterResult,
        notes: []
      },
      []
    );

    expect(reasoning.hypotheses[0].title).toContain(expectations.requiredHypothesis.titleIncludes);
    expect(reasoning.hypotheses[0].status).toBe(expectations.requiredHypothesis.status);
    expect(reasoning.unknowns).toEqual(expect.arrayContaining(expectations.requiredUnknowns));
  });

  it("rejects high-impact findings without evidence references", async () => {
    const invalidBundle = JSON.parse(
      await readFile("data/fixtures/reasoning/invalid-finding-no-evidence.json", "utf8")
    ) as ReasoningBundle;

    const validation = validateReasoningBundle(invalidBundle);

    expect(validation.valid).toBe(false);
    expect(validation.issues.join(" ")).toContain("must cite at least one observation");
  });
});
