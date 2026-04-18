import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { minimizePromptInput } from "../../apps/api/src/privacy/prompt-minimizer";
import { applyRedactions, buildRedactedArtifact } from "../../apps/api/src/privacy/redaction-service";
import { detectSensitiveData } from "../../apps/api/src/privacy/sensitive-data-detector";
import { sanitizeForLog } from "../../apps/api/src/privacy/secure-logger";

describe("privacy services", () => {
  it("detects common secrets, tokens, emails, usernames, and cloud keys", async () => {
    const text = await readFile("data/fixtures/privacy/secrets-in-log.log", "utf8");
    const findings = detectSensitiveData(text, "fixture:secrets");

    expect(findings.map((finding) => finding.type)).toEqual([
      "email",
      "token",
      "username",
      "secret",
      "cloud_access_key",
      "api_key"
    ]);
    expect(findings.every((finding) => finding.fingerprintHash.match(/^[a-f0-9]{16}$/))).toBe(true);
  });

  it("redacts stably without storing original values in the artifact metadata", async () => {
    const text = await readFile("data/fixtures/privacy/secrets-in-log.log", "utf8");
    const expected = JSON.parse(await readFile("data/fixtures/privacy/redacted-expected.json", "utf8")) as {
      mustContain: string[];
      mustNotContain: string[];
    };
    const findings = detectSensitiveData(text, "fixture:secrets");
    const redacted = applyRedactions(text, findings);
    const artifact = buildRedactedArtifact({
      originalRef: "fixture:secrets",
      text,
      findings
    });

    for (const value of expected.mustContain) {
      expect(redacted).toContain(value);
    }
    for (const value of expected.mustNotContain) {
      expect(redacted).not.toContain(value);
      expect(JSON.stringify(artifact.findingIds)).not.toContain(value);
    }
    expect(artifact.redactedText).toBe(redacted);
  });

  it("minimizes provider prompts and secure logs by excluding raw secrets", async () => {
    const text = await readFile("data/fixtures/privacy/secrets-in-log.log", "utf8");
    const findings = detectSensitiveData(text, "fixture:secrets");
    const minimized = minimizePromptInput({
      caseId: "case_privacy_unit",
      provider: "test-provider",
      text,
      findings
    });
    const safeLog = sanitizeForLog(`privacy scan: ${text}`, findings);

    expect(minimized.promptText).toContain("[REDACTED_TOKEN_002]");
    expect(minimized.promptText).not.toContain("CorrectHorseBatteryStaple");
    expect(minimized.packageRecord.excludedFindingIds).toHaveLength(findings.length);
    expect(minimized.packageRecord.redactionSummary).toMatchObject({
      api_key: 1,
      cloud_access_key: 1,
      email: 1,
      secret: 1,
      token: 1,
      username: 1
    });
    expect(safeLog).not.toContain("AKIAIOSFODNN7EXAMPLE");
  });
});
