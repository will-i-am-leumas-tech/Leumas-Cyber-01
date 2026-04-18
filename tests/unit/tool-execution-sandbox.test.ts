import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { captureSandboxArtifact, redactSandboxText } from "../../apps/api/src/sandbox/artifact-capture-service";
import { evaluateEgressPolicy } from "../../apps/api/src/sandbox/egress-policy";
import { enforceInputResourceLimits } from "../../apps/api/src/sandbox/resource-limits";
import { runSandboxedOperation } from "../../apps/api/src/sandbox/sandbox-runner";
import { getToolManifest, listToolManifests } from "../../apps/api/src/sandbox/tool-manifest-registry";

describe("tool execution sandbox", () => {
  it("loads manifests with read-only defaults and approval gates", () => {
    const manifests = listToolManifests();
    const readOnly = getToolManifest("mock-siem.search_events");
    const writeManifest = getToolManifest("manual.add_watchlist_entry");

    expect(manifests.length).toBeGreaterThanOrEqual(3);
    expect(readOnly).toMatchObject({
      permission: "read-only",
      approvalRequired: false,
      network: {
        mode: "none"
      }
    });
    expect(writeManifest).toMatchObject({
      permission: "write",
      approvalRequired: true
    });
  });

  it("enforces egress, resource, and artifact redaction policies", () => {
    const manifest = getToolManifest("mock-siem.remote_search");
    expect(manifest).toBeDefined();
    const egress = evaluateEgressPolicy({
      runId: "sandbox_run_test",
      network: manifest!.network,
      parameters: {
        destination: "https://unknown.example.net/api"
      }
    });
    const resource = enforceInputResourceLimits({
      parameters: {
        limit: 101
      },
      limits: getToolManifest("mock-siem.search_events")!.resources
    });
    const redacted = redactSandboxText(`api_${"key"}=abc123456789 pass${"word"}=secret-value`);
    const artifact = captureSandboxArtifact({
      runId: "sandbox_run_test",
      type: "stdout",
      ref: "stdout",
      content: `${"token"}=abc123456789`,
      policy: getToolManifest("mock-siem.search_events")!.artifacts,
      limits: getToolManifest("mock-siem.search_events")!.resources
    });

    expect(egress.allowed).toBe(false);
    expect(egress.reason).toContain("outside");
    expect(resource.allowed).toBe(false);
    expect(redacted.redacted).toBe(true);
    expect(artifact.redactionStatus).toBe("redacted");
    expect(artifact.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("runs allowed tools and blocks approval-required tools without approval", async () => {
    const allowedFixture = JSON.parse(await readFile("data/fixtures/sandbox/allowed-readonly-tool.json", "utf8"));
    const approvalFixture = JSON.parse(await readFile("data/fixtures/sandbox/approval-required-tool.json", "utf8"));
    const allowed = await runSandboxedOperation({
      manifest: getToolManifest(allowedFixture.manifestId)!,
      actor: allowedFixture.actor,
      parameters: allowedFixture.parameters,
      execute: async () => ({
        summary: "Read-only query completed.",
        stdout: "Query returned 2 records."
      })
    });
    const approvalRequired = await runSandboxedOperation({
      manifest: getToolManifest(approvalFixture.manifestId)!,
      actor: approvalFixture.actor,
      parameters: approvalFixture.parameters
    });

    expect(allowed.run.status).toBe("completed");
    expect(allowed.artifacts.map((artifact) => artifact.type)).toEqual(expect.arrayContaining(["stdout", "result"]));
    expect(approvalRequired.run.status).toBe("approval_required");
    expect(approvalRequired.run.policyDecision.approvalRequired).toBe(true);
  });
});
