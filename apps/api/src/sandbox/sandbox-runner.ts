import path from "node:path";
import type {
  CreateSandboxRunInput,
  SandboxArtifact,
  SandboxRun,
  ToolManifest
} from "../schemas/sandbox.schema";
import { sandboxArtifactSchema, sandboxRunSchema } from "../schemas/sandbox.schema";
import { readJsonFile, writeJsonFile } from "../utils/files";
import { createId } from "../utils/ids";
import { sha256Text } from "../reasoning/hash";
import { nowIso } from "../utils/time";
import { captureSandboxArtifact } from "./artifact-capture-service";
import { evaluateEgressPolicy } from "./egress-policy";
import { enforceInputResourceLimits, didTimeOut } from "./resource-limits";
import { getToolManifest, listToolManifests } from "./tool-manifest-registry";

export interface SandboxExecutionResult {
  summary: string;
  stdout?: string;
  stderr?: string;
  records?: Array<Record<string, unknown>>;
}

export interface SandboxRunResult {
  run: SandboxRun;
  artifacts: SandboxArtifact[];
}

interface SandboxState {
  runs: SandboxRun[];
  artifacts: SandboxArtifact[];
}

function emptyState(): SandboxState {
  return {
    runs: [],
    artifacts: []
  };
}

function deniedRun(input: {
  runId: string;
  manifestId: string;
  actor: string;
  caseId?: string;
  dryRun: boolean;
  startedAt: string;
  parametersHash: string;
  reason: string;
  approvalRequired?: boolean;
}): SandboxRun {
  return sandboxRunSchema.parse({
    id: input.runId,
    caseId: input.caseId,
    manifestId: input.manifestId,
    actor: input.actor,
    status: input.approvalRequired ? "approval_required" : "denied",
    dryRun: input.dryRun,
    startedAt: input.startedAt,
    completedAt: nowIso(),
    parametersHash: input.parametersHash,
    policyDecision: {
      allowed: false,
      reason: input.reason,
      approvalRequired: Boolean(input.approvalRequired)
    },
    artifactIds: [],
    summary: input.reason
  });
}

function validateAllowedInputs(manifest: ToolManifest, parameters: Record<string, unknown>): string | undefined {
  const disallowed = Object.keys(parameters).filter((key) => !manifest.allowedInputs.includes(key));
  return disallowed.length > 0 ? `Parameters are not declared in manifest: ${disallowed.join(", ")}.` : undefined;
}

export async function runSandboxedOperation(input: {
  caseId?: string;
  manifest: ToolManifest;
  actor: string;
  parameters: Record<string, unknown>;
  dryRun?: boolean;
  approvalId?: string;
  execute?: () => Promise<SandboxExecutionResult>;
}): Promise<SandboxRunResult> {
  const startedAtMs = Date.now();
  const startedAt = nowIso();
  const runId = createId("sandbox_run");
  const parametersHash = sha256Text(JSON.stringify(input.parameters));
  const dryRun = input.dryRun ?? false;

  if (!input.manifest.enabled) {
    return {
      run: deniedRun({
        runId,
        manifestId: input.manifest.id,
        actor: input.actor,
        caseId: input.caseId,
        dryRun,
        startedAt,
        parametersHash,
        reason: "Manifest is disabled."
      }),
      artifacts: []
    };
  }

  const inputError = validateAllowedInputs(input.manifest, input.parameters);
  if (inputError) {
    return {
      run: deniedRun({
        runId,
        manifestId: input.manifest.id,
        actor: input.actor,
        caseId: input.caseId,
        dryRun,
        startedAt,
        parametersHash,
        reason: inputError
      }),
      artifacts: []
    };
  }

  const resourceDecision = enforceInputResourceLimits({
    parameters: input.parameters,
    limits: input.manifest.resources
  });
  if (!resourceDecision.allowed) {
    return {
      run: deniedRun({
        runId,
        manifestId: input.manifest.id,
        actor: input.actor,
        caseId: input.caseId,
        dryRun,
        startedAt,
        parametersHash,
        reason: resourceDecision.reason
      }),
      artifacts: []
    };
  }

  const egressDecision = evaluateEgressPolicy({
    runId,
    network: input.manifest.network,
    parameters: input.parameters
  });
  if (!egressDecision.allowed) {
    return {
      run: {
        ...deniedRun({
          runId,
          manifestId: input.manifest.id,
          actor: input.actor,
          caseId: input.caseId,
          dryRun,
          startedAt,
          parametersHash,
          reason: egressDecision.reason
        }),
        egressDecision
      },
      artifacts: []
    };
  }

  if (input.manifest.approvalRequired && !input.approvalId) {
    return {
      run: {
        ...deniedRun({
          runId,
          manifestId: input.manifest.id,
          actor: input.actor,
          caseId: input.caseId,
          dryRun,
          startedAt,
          parametersHash,
          reason: "Manifest requires approval before execution.",
          approvalRequired: true
        }),
        egressDecision
      },
      artifacts: []
    };
  }

  const execution = dryRun
    ? {
        summary: `Dry run only. Would execute ${input.manifest.operation} inside sandbox ${input.manifest.id}.`,
        stdout: "Dry run completed without external state changes."
      }
    : input.execute
      ? await input.execute()
      : {
          summary: `Sandbox no-op completed for ${input.manifest.id}.`,
          stdout: "No connector execution function was provided."
        };
  const completedAtMs = Date.now();
  const timedOut = didTimeOut(startedAtMs, completedAtMs, input.manifest.resources);
  const artifacts = [
    input.manifest.artifacts.captureStdout && execution.stdout
      ? captureSandboxArtifact({
          runId,
          type: "stdout",
          ref: `${runId}:stdout`,
          content: execution.stdout,
          policy: input.manifest.artifacts,
          limits: input.manifest.resources
        })
      : undefined,
    input.manifest.artifacts.captureStderr && execution.stderr
      ? captureSandboxArtifact({
          runId,
          type: "stderr",
          ref: `${runId}:stderr`,
          content: execution.stderr,
          policy: input.manifest.artifacts,
          limits: input.manifest.resources
        })
      : undefined,
    input.manifest.artifacts.captureResultSummary
      ? captureSandboxArtifact({
          runId,
          type: "result",
          ref: `${runId}:result`,
          content: execution.summary,
          policy: input.manifest.artifacts,
          limits: input.manifest.resources
        })
      : undefined
  ].filter((artifact): artifact is SandboxArtifact => Boolean(artifact));

  const run = sandboxRunSchema.parse({
    id: runId,
    caseId: input.caseId,
    manifestId: input.manifest.id,
    actor: input.actor,
    status: timedOut ? "timed_out" : "completed",
    dryRun,
    approvalId: input.approvalId,
    startedAt,
    completedAt: nowIso(),
    parametersHash,
    policyDecision: {
      allowed: !timedOut,
      reason: timedOut ? "Sandbox run exceeded timeout limit." : "Sandbox policy allowed execution.",
      approvalRequired: input.manifest.approvalRequired
    },
    egressDecision,
    artifactIds: artifacts.map((artifact) => artifact.id),
    summary: timedOut ? "Sandbox run timed out." : execution.summary
  });

  return { run, artifacts };
}

export class SandboxRunStore {
  constructor(private readonly dataDir: string) {}

  private statePath(): string {
    return path.join(this.dataDir, "sandbox", "state.json");
  }

  private async readState(): Promise<SandboxState> {
    try {
      const state = await readJsonFile<SandboxState>(this.statePath());
      return {
        runs: state.runs.map((run) => sandboxRunSchema.parse(run)),
        artifacts: state.artifacts.map((artifact) => sandboxArtifactSchema.parse(artifact))
      };
    } catch {
      return emptyState();
    }
  }

  private async writeState(state: SandboxState): Promise<void> {
    await writeJsonFile(this.statePath(), state);
  }

  async createRun(input: CreateSandboxRunInput): Promise<SandboxRunResult> {
    const manifest = getToolManifest(input.manifestId);
    if (!manifest) {
      const run = deniedRun({
        runId: createId("sandbox_run"),
        manifestId: input.manifestId,
        actor: input.actor,
        caseId: input.caseId,
        dryRun: input.dryRun,
        startedAt: nowIso(),
        parametersHash: sha256Text(JSON.stringify(input.parameters)),
        reason: "Manifest was not found."
      });
      const state = await this.readState();
      state.runs.push(run);
      await this.writeState(state);
      return { run, artifacts: [] };
    }

    const result = await runSandboxedOperation({
      caseId: input.caseId,
      manifest,
      actor: input.actor,
      parameters: input.parameters,
      dryRun: input.dryRun,
      approvalId: input.approvalId
    });
    const state = await this.readState();
    state.runs.push(result.run);
    state.artifacts.push(...result.artifacts);
    await this.writeState(state);
    return result;
  }

  async listManifests(): Promise<ToolManifest[]> {
    return listToolManifests();
  }

  async getRun(runId: string): Promise<SandboxRun | null> {
    return (await this.readState()).runs.find((run) => run.id === runId) ?? null;
  }

  async getArtifacts(runId: string): Promise<SandboxArtifact[]> {
    return (await this.readState()).artifacts.filter((artifact) => artifact.runId === runId);
  }

  async approveRun(runId: string, approved: boolean, approver: string): Promise<SandboxRun | null> {
    const state = await this.readState();
    const run = state.runs.find((candidate) => candidate.id === runId);
    if (!run) {
      return null;
    }
    const updated = sandboxRunSchema.parse({
      ...run,
      approvalId: approved ? `sandbox_approval:${approver}` : run.approvalId,
      status: approved ? "planned" : "denied",
      policyDecision: {
        ...run.policyDecision,
        allowed: approved,
        reason: approved ? "Sandbox run was approved for later execution." : "Sandbox run approval was rejected."
      },
      completedAt: nowIso(),
      summary: approved ? "Sandbox approval recorded." : "Sandbox approval rejected."
    });
    state.runs = state.runs.map((candidate) => (candidate.id === runId ? updated : candidate));
    await this.writeState(state);
    return updated;
  }
}
