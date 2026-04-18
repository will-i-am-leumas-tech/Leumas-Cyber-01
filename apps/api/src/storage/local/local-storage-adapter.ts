import type { StorageAdapter } from "../storage-adapter";
import { LocalJsonArtifactRepository } from "./local-artifact-repository";
import { LocalJsonAuditRepository } from "./local-audit-repository";
import { LocalJsonCaseRepository } from "./local-case-repository";

export function createLocalJsonStorageAdapter(dataDir: string): StorageAdapter {
  return {
    kind: "local-json",
    cases: new LocalJsonCaseRepository(dataDir),
    audits: new LocalJsonAuditRepository(dataDir),
    artifacts: new LocalJsonArtifactRepository(dataDir)
  };
}
