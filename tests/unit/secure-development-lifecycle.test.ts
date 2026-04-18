import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateSbom } from "../../scripts/generate-sbom";
import { scanSecrets } from "../../scripts/security-scan";

describe("secure development lifecycle", () => {
  it("detects seeded unapproved secrets and ignores approved fake fixtures", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "leumas-secret-scan-"));
    const seededSecret = path.join(tempDir, "seeded-secret.txt");
    const seededSecretValue = "abc1234567890" + "abcdef1234567890";
    await writeFile(seededSecret, `client_secret=${seededSecretValue}\n`, "utf8");

    const findings = await scanSecrets([seededSecret]);
    expect(findings).toEqual([
      expect.objectContaining({
        type: "assigned_secret",
        line: 1
      })
    ]);

    const approvedFindings = await scanSecrets(["docs/security/examples/fake-secret-for-scanner.txt"]);
    expect(approvedFindings).toHaveLength(0);
  });

  it("keeps CI and security workflows wired to release gates", async () => {
    const ci = await readFile(".github/workflows/ci.yml", "utf8");
    const security = await readFile(".github/workflows/security.yml", "utf8");

    for (const command of [
      "npm ci",
      "npm run lint",
      "npm run typecheck",
      "npm run security:scan",
      "npm run evals",
      "npm test",
      "npm run build",
      "npm audit --omit=dev"
    ]) {
      expect(ci).toContain(command);
    }
    expect(security).toContain("npm run security:scan");
    expect(security).toContain("npm audit --omit=dev");
    expect(security).toContain("npm run security:sbom");
  });

  it("documents threat-model review triggers and release commands", async () => {
    const threatModel = await readFile("docs/security/threat-model.md", "utf8");
    const releaseChecklist = await readFile("docs/security/release-checklist.md", "utf8");

    expect(threatModel).toContain("API to model boundary");
    expect(threatModel).toContain("API to tool boundary");
    expect(threatModel).toContain("API to storage boundary");
    expect(threatModel).toContain("Adding or changing a tool connector requires updating this threat model");
    expect(releaseChecklist).toContain("npm run evals");
    expect(releaseChecklist).toContain("npm run security:scan");
    expect(releaseChecklist).toContain("npm audit --omit=dev");
  });

  it("generates a local SBOM from the package lock", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "leumas-sbom-"));
    const sbom = await generateSbom(path.join(tempDir, "sbom.json"));

    expect(sbom).toMatchObject({
      bomFormat: "CycloneDX",
      specVersion: "1.5"
    });
    expect((sbom.components as Array<{ name: string }>).some((component) => component.name === "fastify")).toBe(true);
  });
});
