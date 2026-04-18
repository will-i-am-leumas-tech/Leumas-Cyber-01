import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { normalizeEndpointEvents, normalizeEndpointLogText } from "../../apps/api/src/endpoint/endpoint-event-normalizer";
import { buildProcessTree } from "../../apps/api/src/endpoint/process-tree-service";
import { buildArtifactChecklist } from "../../apps/api/src/forensics/artifact-checklist-service";
import { buildSampleAnalysisSummary } from "../../apps/api/src/forensics/sample-analysis-service";

describe("endpoint and forensics services", () => {
  it("builds process trees from out-of-order endpoint events", async () => {
    const fixture = JSON.parse(await readFile("data/fixtures/endpoint/process-tree.json", "utf8"));
    const events = normalizeEndpointEvents(fixture, "case_endpoint");
    const [tree] = buildProcessTree(events, "case_endpoint");

    expect(tree.host).toBe("WS-42");
    expect(tree.roots).toHaveLength(1);
    expect(tree.roots[0].processGuid).toBe("proc-winword");
    expect(tree.roots[0].children[0].processGuid).toBe("proc-powershell");
    expect(tree.roots[0].children[0].children[0].processGuid).toBe("proc-cmd");
  });

  it("retains orphan processes with warnings", async () => {
    const fixture = JSON.parse(await readFile("data/fixtures/endpoint/orphan-process-events.json", "utf8"));
    const events = normalizeEndpointEvents(fixture, "case_endpoint");
    const [tree] = buildProcessTree(events, "case_endpoint");

    expect(tree.roots).toHaveLength(1);
    expect(tree.roots[0].processGuid).toBe("proc-orphan-child");
    expect(tree.warnings[0]).toContain("Parent process not found");
  });

  it("adds suspicious process-chain risk signals and forensic checklist items", async () => {
    const text = await readFile("data/fixtures/logs/windows-process.log", "utf8");
    const events = normalizeEndpointLogText(text, "case_endpoint");
    const [tree] = buildProcessTree(events, "case_endpoint");
    const checklist = buildArtifactChecklist("case_endpoint", events);

    const riskSignals = JSON.stringify(tree.roots);
    expect(riskSignals).toContain("suspicious_office_child");
    expect(riskSignals).toContain("encoded_powershell");
    expect(checklist.map((item) => item.type)).toEqual(expect.arrayContaining(["process_logs", "script_block_logs", "prefetch"]));
  });

  it("keeps sample-analysis summaries defensive", () => {
    const summary = buildSampleAnalysisSummary("case_endpoint", {
      observedBehavior: ["Sample tried to evade detection with a payload."],
      detections: ["Static scanner flagged suspicious script behavior."]
    });

    expect(summary.observedBehavior.join(" ")).toContain("Unsafe procedural detail removed");
    expect(JSON.stringify(summary)).not.toMatch(/evade detection with a payload/i);
    expect(summary.safeRemediationGuidance.join(" ")).toContain("approved defensive action workflows");
  });
});
