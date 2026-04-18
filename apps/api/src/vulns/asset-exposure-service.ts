import {
  assetExposureV2Schema,
  type AssetExposureV2,
  type ScannerDeltaImportInput
} from "../schemas/vulnerabilities-v2.schema";
import type { AssetRiskProfile, VulnerabilityFinding } from "../schemas/vulnerabilities.schema";
import { nowIso } from "../utils/time";

export function exposureFromAssetProfile(asset: AssetRiskProfile): AssetExposureV2 {
  const timestamp = nowIso();
  return assetExposureV2Schema.parse({
    assetId: asset.assetId,
    assetName: asset.assetName,
    owner: asset.owner,
    businessCriticality: asset.businessCriticality,
    internetExposure: asset.internetExposure,
    environment: asset.internetExposure ? "production" : "unknown",
    exposurePaths: asset.internetExposure ? ["internet-facing service"] : [],
    controlCoverage: asset.compensatingControls,
    compensatingControls: asset.compensatingControls,
    createdAt: timestamp,
    updatedAt: timestamp
  });
}

export function exposureFromDelta(input: ScannerDeltaImportInput): AssetExposureV2[] {
  const timestamp = nowIso();
  return input.assetExposure.map((asset) =>
    assetExposureV2Schema.parse({
      ...asset,
      createdAt: timestamp,
      updatedAt: timestamp
    })
  );
}

export function defaultExposureForFinding(finding: VulnerabilityFinding): AssetExposureV2 {
  const timestamp = nowIso();
  return assetExposureV2Schema.parse({
    assetId: finding.assetId,
    assetName: finding.assetName,
    owner: "asset-owner",
    businessCriticality: "medium",
    internetExposure: false,
    environment: "unknown",
    exposurePaths: [],
    controlCoverage: [],
    compensatingControls: [],
    createdAt: timestamp,
    updatedAt: timestamp
  });
}
