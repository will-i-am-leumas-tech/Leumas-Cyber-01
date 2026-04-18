import { describe, expect, it } from "vitest";
import { buildControlEvidenceReport } from "../../apps/api/src/validation/control-evidence-report";
import { replayBenignTelemetry } from "../../apps/api/src/validation/detection-replay-service";
import { enforceLabMode } from "../../apps/api/src/validation/lab-mode-enforcer";
import { buildAuthorizedScopeV2, verifyScopeV2Signature } from "../../apps/api/src/validation/scope-v2-service";
import { evaluateTargetScope } from "../../apps/api/src/validation/target-scope-policy";
import { listValidationTemplates } from "../../apps/api/src/validation/validation-template-library";
import type { ValidationCampaignV2 } from "../../apps/api/src/schemas/validation-v2.schema";

describe("authorized validation lab v2", () => {
  it("builds signed scopes and detects tampering", () => {
    const scope = buildAuthorizedScopeV2({
      name: "Approved lab validation",
      owner: "soc@example.test",
      approver: "security-lead@example.test",
      targetAllowlist: ["lab-host-01.example.test", "*.lab.example.test"],
      targetDenylist: ["prod-db-01.example.test"],
      startsAt: "2026-04-17T00:00:00.000Z",
      expiresAt: "2026-12-31T23:59:59.000Z",
      labMode: true,
      approvedTemplateIds: ["safe-control-validation"]
    });

    expect(verifyScopeV2Signature(scope)).toBe(true);
    expect(verifyScopeV2Signature({ ...scope, targetAllowlist: ["prod-db-01.example.test"] })).toBe(false);
  });

  it("allows only allowlisted targets and enforces denylist precedence", () => {
    const scope = buildAuthorizedScopeV2({
      name: "Approved lab validation",
      owner: "soc@example.test",
      approver: "security-lead@example.test",
      targetAllowlist: ["lab-host-01.example.test", "*.lab.example.test"],
      targetDenylist: ["prod-db-01.example.test"],
      startsAt: "2026-04-17T00:00:00.000Z",
      expiresAt: "2026-12-31T23:59:59.000Z",
      labMode: true,
      approvedTemplateIds: ["safe-control-validation"]
    });

    expect(evaluateTargetScope({ scope, target: "lab-host-01.example.test" }).allowed).toBe(true);
    expect(evaluateTargetScope({ scope, target: "sensor.lab.example.test" }).allowed).toBe(true);
    expect(evaluateTargetScope({ scope, target: "prod-db-01.example.test" })).toMatchObject({
      allowed: false,
      reason: "target_denied"
    });
    expect(evaluateTargetScope({ scope, target: "unknown.example.test" })).toMatchObject({
      allowed: false,
      reason: "target_not_allowlisted"
    });
  });

  it("keeps templates lab-only and generates remediation-focused reports", () => {
    const templates = listValidationTemplates();
    const template = templates[0];
    if (!template) {
      throw new Error("Expected at least one validation template.");
    }
    const scope = buildAuthorizedScopeV2({
      name: "Approved lab validation",
      owner: "soc@example.test",
      approver: "security-lead@example.test",
      targetAllowlist: ["lab-host-01.example.test"],
      startsAt: "2026-04-17T00:00:00.000Z",
      expiresAt: "2026-12-31T23:59:59.000Z",
      labMode: true,
      approvedTemplateIds: ["safe-control-validation"]
    });
    const campaign: ValidationCampaignV2 = {
      id: "validation_campaign_v2_test",
      scopeId: scope.id,
      templateIds: ["safe-control-validation"],
      actor: "analyst@example.test",
      target: "lab-host-01.example.test",
      status: "planned",
      evidenceIds: [],
      safetyDecisions: ["authorized_scope_valid"],
      createdAt: "2026-04-18T00:00:00.000Z",
      updatedAt: "2026-04-18T00:00:00.000Z"
    };

    expect(enforceLabMode(scope, templates).allowed).toBe(true);
    expect(enforceLabMode({ ...scope, labMode: false }, templates)).toMatchObject({ allowed: false, reason: "lab_mode_required" });
    expect(JSON.stringify(templates)).not.toMatch(/reverse shell|credential theft steps|bypass edr/i);

    const replayed = replayBenignTelemetry({ campaign, templates: [template] });
    const report = buildControlEvidenceReport({ campaign, templates: [template], replayedTelemetry: replayed });

    expect(replayed.length).toBeGreaterThan(0);
    expect(report.citations).toHaveLength(replayed.length);
    expect(report.remediation.join(" ")).not.toMatch(/exploit|payload|stealth/i);
  });
});
