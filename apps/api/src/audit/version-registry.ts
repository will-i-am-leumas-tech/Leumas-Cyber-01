import { defensiveAnalysisPromptVersion } from "../prompts/defensive-analysis.prompt";
import type { VersionRecord } from "../schemas/audit.schema";
import { safetyPolicyVersion } from "../safety/policy-engine";

const effectiveAt = "2026-04-17T00:00:00.000Z";

export function getVersionRecords(provider = "local-mock"): VersionRecord[] {
  return [
    {
      component: "prompt:defensive-analysis",
      version: defensiveAnalysisPromptVersion,
      effectiveAt
    },
    {
      component: "policy:safety",
      version: safetyPolicyVersion,
      effectiveAt
    },
    {
      component: "model-provider",
      version: provider,
      effectiveAt
    },
    {
      component: "code",
      version: process.env.GIT_COMMIT ?? process.env.npm_package_version ?? "workspace",
      effectiveAt
    }
  ];
}
