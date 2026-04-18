import { describe, expect, it } from "vitest";
import { evaluateEgressPolicy } from "../../apps/api/src/sandbox/egress-policy";
import { runSandboxedOperation } from "../../apps/api/src/sandbox/sandbox-runner";
import { getToolManifest } from "../../apps/api/src/sandbox/tool-manifest-registry";

describe("sandbox egress policy", () => {
  it("blocks network egress outside the manifest allowlist", async () => {
    const manifest = getToolManifest("mock-siem.remote_search");
    expect(manifest).toBeDefined();

    const result = await runSandboxedOperation({
      manifest: manifest!,
      actor: "analyst@example.test",
      parameters: {
        query: "203.0.113.10",
        destination: "https://evil.example.net/search"
      },
      execute: async () => ({
        summary: "This should not execute.",
        stdout: "unreachable"
      })
    });

    expect(result.run.status).toBe("denied");
    expect(result.run.egressDecision?.allowed).toBe(false);
    expect(result.artifacts).toHaveLength(0);
  });

  it("allows only declared network destinations", () => {
    const manifest = getToolManifest("mock-siem.remote_search")!;
    const allowed = evaluateEgressPolicy({
      runId: "sandbox_run_allowed",
      network: manifest.network,
      parameters: {
        destination: "https://siem.internal.example/api"
      }
    });
    const denied = evaluateEgressPolicy({
      runId: "sandbox_run_denied",
      network: manifest.network,
      parameters: {
        destination: "https://siem.external.example/api"
      }
    });

    expect(allowed.allowed).toBe(true);
    expect(denied.allowed).toBe(false);
  });
});
