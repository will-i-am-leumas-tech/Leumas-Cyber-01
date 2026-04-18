import { toolManifestSchema, type ToolManifest } from "../schemas/sandbox.schema";

const manifests: ToolManifest[] = [
  toolManifestSchema.parse({
    id: "mock-siem.search_events",
    connectorId: "mock-siem",
    operation: "search_events",
    displayName: "Mock SIEM Event Search",
    description: "Read-only search against local mock SIEM fixture records.",
    permission: "read-only",
    allowedInputs: ["query", "limit"],
    network: {
      mode: "none",
      allowedTargets: []
    },
    writes: {
      mode: "artifact-only",
      allowedPaths: ["sandbox/artifacts"]
    },
    resources: {
      timeoutMs: 2000,
      maxOutputBytes: 8192,
      maxRecords: 100,
      cpuShare: 0.25,
      memoryMb: 128
    },
    artifacts: {
      captureStdout: true,
      captureStderr: true,
      captureResultSummary: true,
      redactSecrets: true,
      retainForDays: 14
    },
    approvalRequired: false,
    enabled: true
  }),
  toolManifestSchema.parse({
    id: "mock-siem.remote_search",
    connectorId: "mock-siem",
    operation: "remote_search",
    displayName: "Mock Remote Search",
    description: "Denied-by-default networked search used to test egress controls.",
    permission: "read-only",
    allowedInputs: ["query", "destination"],
    network: {
      mode: "allowlist",
      allowedTargets: ["siem.internal.example"]
    },
    writes: {
      mode: "artifact-only",
      allowedPaths: ["sandbox/artifacts"]
    },
    resources: {
      timeoutMs: 2000,
      maxOutputBytes: 8192,
      maxRecords: 100,
      cpuShare: 0.25,
      memoryMb: 128
    },
    artifacts: {
      captureStdout: true,
      captureStderr: true,
      captureResultSummary: true,
      redactSecrets: true,
      retainForDays: 14
    },
    approvalRequired: false,
    enabled: true
  }),
  toolManifestSchema.parse({
    id: "manual.add_watchlist_entry",
    connectorId: "manual",
    operation: "add_watchlist_entry",
    displayName: "Manual Watchlist Entry",
    description: "Write-capable defensive watchlist change that requires explicit approval.",
    permission: "write",
    allowedInputs: ["indicator", "reason", "ttl"],
    network: {
      mode: "none",
      allowedTargets: []
    },
    writes: {
      mode: "artifact-only",
      allowedPaths: ["sandbox/artifacts"]
    },
    resources: {
      timeoutMs: 2000,
      maxOutputBytes: 4096,
      maxRecords: 10,
      cpuShare: 0.25,
      memoryMb: 128
    },
    artifacts: {
      captureStdout: true,
      captureStderr: true,
      captureResultSummary: true,
      redactSecrets: true,
      retainForDays: 14
    },
    approvalRequired: true,
    enabled: true
  })
];

export function listToolManifests(): ToolManifest[] {
  return manifests;
}

export function getToolManifest(manifestId: string): ToolManifest | undefined {
  return manifests.find((manifest) => manifest.id === manifestId);
}

export function getToolManifestForOperation(connectorId: string, operation: string): ToolManifest | undefined {
  return manifests.find((manifest) => manifest.connectorId === connectorId && manifest.operation === operation);
}
