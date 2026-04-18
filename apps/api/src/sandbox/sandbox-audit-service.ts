import type { SandboxArtifact, SandboxRun } from "../schemas/sandbox.schema";

export function sandboxAuditMetadata(run: SandboxRun, artifacts: SandboxArtifact[]): Record<string, unknown> {
  return {
    sandboxRunId: run.id,
    manifestId: run.manifestId,
    status: run.status,
    dryRun: run.dryRun,
    policyDecision: run.policyDecision,
    egressDecision: run.egressDecision,
    artifactIds: artifacts.map((artifact) => artifact.id),
    artifactHashes: artifacts.map((artifact) => artifact.hash)
  };
}

export function sandboxAuditSummary(run: SandboxRun): string {
  if (run.status === "denied") {
    return `Sandbox run denied for ${run.manifestId}: ${run.policyDecision.reason}.`;
  }
  if (run.status === "approval_required") {
    return `Sandbox run requires approval for ${run.manifestId}.`;
  }
  return `Sandbox run ${run.status} for ${run.manifestId}.`;
}
