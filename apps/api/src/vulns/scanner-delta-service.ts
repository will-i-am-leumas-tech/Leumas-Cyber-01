import type {
  ScannerDeltaFinding,
  ScannerDeltaResult
} from "../schemas/vulnerabilities-v2.schema";
import type { VulnerabilityFinding } from "../schemas/vulnerabilities.schema";
import { nowIso } from "../utils/time";

export function vulnerabilityNaturalKey(input: Pick<ScannerDeltaFinding | VulnerabilityFinding, "scanner" | "assetId" | "cve">): string {
  return [input.scanner, input.assetId, input.cve].map((value) => value.toLowerCase()).join("|");
}

export function buildScannerDeltaResult(input: {
  createdFindingIds: string[];
  updatedFindingIds: string[];
  resolvedFindingIds: string[];
}): ScannerDeltaResult {
  return {
    createdFindingIds: input.createdFindingIds,
    updatedFindingIds: input.updatedFindingIds,
    resolvedFindingIds: input.resolvedFindingIds,
    importedAt: nowIso()
  };
}
