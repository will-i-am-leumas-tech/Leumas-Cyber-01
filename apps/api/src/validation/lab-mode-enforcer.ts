import type { AuthorizedScopeV2, ValidationTemplate } from "../schemas/validation-v2.schema";

export interface LabModeDecision {
  allowed: boolean;
  reason?: string;
  warnings: string[];
}

export function enforceLabMode(scope: AuthorizedScopeV2, templates: ValidationTemplate[]): LabModeDecision {
  const labRequired = templates.some((template) => template.requiresLabMode);
  if (labRequired && !scope.labMode) {
    return {
      allowed: false,
      reason: "lab_mode_required",
      warnings: ["Selected validation templates require lab mode scope."]
    };
  }

  return {
    allowed: true,
    warnings: scope.labMode ? ["Lab mode enforced for validation campaign."] : []
  };
}
