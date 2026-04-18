import { describe, expect, it } from "vitest";
import { buildDetectionRuleV2Variants } from "../../apps/api/src/detections/detection-rule-v2-builder";
import { buildCorpusItems, runDetectionCorpus } from "../../apps/api/src/detections/detection-corpus-service";
import { simulateFalsePositives } from "../../apps/api/src/detections/false-positive-simulator";
import { listRuleFormats } from "../../apps/api/src/detections/rule-format-registry";
import { validateRuleV2 } from "../../apps/api/src/detections/rule-validator";
import { buildSigmaLikeRule } from "../../apps/api/src/detections/sigma-rule-builder";
import type { DetectionIntent } from "../../apps/api/src/schemas/detections.schema";

const intent: DetectionIntent = {
  id: "detection_intent_001",
  behavior: "Suspicious PowerShell execution with encoded command indicators",
  category: "execution",
  severity: "high",
  dataSources: ["endpoint.process_creation", "windows.event_4688"],
  entities: [],
  evidenceRefs: ["artifact_001:line:1"],
  createdAt: "2026-04-16T00:00:00.000Z"
};

describe("detection engineering v2", () => {
  it("builds translated KQL, SPL, and YARA variants with defensive metadata", () => {
    const rule = buildSigmaLikeRule(intent, 1);
    const variants = buildDetectionRuleV2Variants({ intent, rule });

    expect(listRuleFormats().map((format) => format.id)).toEqual(expect.arrayContaining(["kql", "spl", "yara"]));
    expect(variants.map((variant) => variant.format)).toEqual(["sigma-like-json", "kql", "spl", "yara"]);
    expect(variants.find((variant) => variant.format === "kql")?.content).toContain("| where");
    expect(variants.find((variant) => variant.format === "spl")?.content).toContain("index=security");
    expect(variants.find((variant) => variant.format === "yara")?.content).toContain("purpose = \"defensive detection\"");
    expect(variants.every((variant) => variant.metadata.evidenceIds.length > 0)).toBe(true);
  });

  it("validates v2 rule content and fails unsafe detection text", () => {
    const rule = buildSigmaLikeRule(intent, 1);
    const [sigmaLike] = buildDetectionRuleV2Variants({ intent, rule });
    const valid = validateRuleV2(sigmaLike);
    const unsafe = validateRuleV2({
      ...sigmaLike,
      id: "detection_rule_v2_unsafe",
      content: "reverse shell payload detection bypass edr"
    });

    expect(valid.passed).toBe(true);
    expect(unsafe.passed).toBe(false);
    expect(unsafe.warnings.join(" ")).toMatch(/payload_or_shell|evasion/);
  });

  it("runs corpus tests and scores benign false-positive risk", () => {
    const rule = buildSigmaLikeRule(intent, 1);
    const corpusItems = buildCorpusItems([
      {
        label: "positive",
        source: "positive fixture",
        expectedMatch: true,
        eventData: {
          process: {
            image: "powershell.exe",
            command_line: "-EncodedCommand SQBFAFgA"
          }
        },
        tags: ["encoded PowerShell"]
      },
      {
        label: "benign",
        source: "benign admin fixture",
        expectedMatch: false,
        eventData: {
          process: {
            image: "powershell.exe",
            command_line: "Get-Service WinRM"
          }
        },
        tags: ["admin automation"]
      }
    ]);

    const run = runDetectionCorpus(rule, corpusItems);
    const simulation = simulateFalsePositives(rule, corpusItems);

    expect(run.passed).toBe(true);
    expect(run.results.map((result) => result.actualMatch)).toEqual([true, false]);
    expect(simulation.riskScore).toBe(0);
    expect(simulation.tuningSuggestions[0]).toContain("No benign corpus matches");
  });
});
