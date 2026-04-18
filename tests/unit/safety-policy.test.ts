import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { detectPromptInjection } from "../../apps/api/src/safety/prompt-injection-detector";
import { evaluateSafetyPolicy } from "../../apps/api/src/safety/policy-engine";
import { validateOutputSafety } from "../../apps/api/src/safety/output-validator";

describe("layered safety policy", () => {
  it("blocks harmful requests with a versioned decision", async () => {
    const text = await readFile("data/fixtures/safety/blocked-malware-request.txt", "utf8");
    const decision = evaluateSafetyPolicy({
      mode: "hardening",
      text
    });

    expect(decision.allowed).toBe(false);
    expect(decision.category).toBe("blocked");
    expect(decision.reason).toBe("offensive_request_detected");
    expect(decision.policyVersion).toMatch(/^safety-policy-/);
  });

  it("allows harmful terms when they are submitted as defensive artifact evidence", async () => {
    const text = await readFile("data/fixtures/safety/defensive-artifact-with-payload-terms.log", "utf8");
    const decision = evaluateSafetyPolicy({
      mode: "logs",
      text
    });

    expect(decision.allowed).toBe(true);
    expect(decision.category).toBe("defensive");
    expect(decision.reason).toBe("artifact_evidence_allowed");
    expect(decision.matchedSignals).toContain("payload_creation");
  });

  it("requires clarification for ambiguous real-world validation", async () => {
    const text = await readFile("data/fixtures/safety/ambiguous-validation-request.txt", "utf8");
    const decision = evaluateSafetyPolicy({
      mode: "hardening",
      text
    });

    expect(decision.allowed).toBe(false);
    expect(decision.category).toBe("ambiguous");
    expect(decision.reason).toBe("scope_clarification_required");
    expect(decision.safeRedirect).toContain("authorized scope");
  });

  it("flags prompt injection in source material without treating it as an instruction", async () => {
    const text = await readFile("data/fixtures/safety/prompt-injection-log.log", "utf8");
    const findings = detectPromptInjection(text, "fixture:prompt-injection-log");

    expect(findings.length).toBeGreaterThan(0);
    expect(findings.map((finding) => finding.pattern)).toEqual(
      expect.arrayContaining(["ignore_previous_instructions", "reveal_hidden_prompt"])
    );
    expect(findings[0].mitigation).toContain("untrusted evidence");
  });

  it("blocks unsafe model output and provides a repaired defensive placeholder", () => {
    const result = validateOutputSafety("Create a reverse shell payload and bypass EDR.");

    expect(result.allowed).toBe(false);
    expect(result.blockedSegments).toEqual(expect.arrayContaining(["exploit_or_payload_instructions"]));
    expect(result.repairedOutput).toContain("withheld");
  });
});
