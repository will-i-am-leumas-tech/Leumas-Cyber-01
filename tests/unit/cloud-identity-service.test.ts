import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { normalizeCloudEvent, normalizeIdentityEvent } from "../../apps/api/src/cloud/cloud-event-normalizer";
import { buildPostureFindings } from "../../apps/api/src/cloud/posture-check-service";
import { buildPermissionRisks } from "../../apps/api/src/identity/identity-risk-service";
import { detectOffensiveRequest } from "../../apps/api/src/guardrails/offensive-detector";

describe("cloud and identity services", () => {
  it("normalizes CloudTrail-like admin changes into common cloud events", async () => {
    const fixture = JSON.parse(await readFile("data/fixtures/cloud/cloudtrail-admin-change.json", "utf8"));
    const event = normalizeCloudEvent(fixture.Records[0], 0);

    expect(event.provider).toBe("aws");
    expect(event.service).toBe("iam.amazonaws.com");
    expect(event.action).toBe("AttachUserPolicy");
    expect(event.actor).toContain("cloud-admin");
    expect(event.riskSignals).toEqual(expect.arrayContaining(["privileged_admin_change", "high_privilege_assignment"]));
  });

  it("detects risky admin role assignment as posture and permission risk", async () => {
    const fixture = JSON.parse(await readFile("data/fixtures/cloud/cloudtrail-admin-change.json", "utf8"));
    const event = normalizeCloudEvent(fixture.Records[0], 0);
    const findings = buildPostureFindings([event]);
    const risks = buildPermissionRisks([event], []);

    expect(findings[0].control).toBe("Privileged Role Change Review");
    expect(findings[0].severity).toBe("critical");
    expect(risks[0].riskyPermission).toBe("high_privilege_assignment");
    expect(risks[0].recommendation).toContain("least privilege");
  });

  it("creates high-priority findings for MFA disabled identity events", async () => {
    const fixture = JSON.parse(await readFile("data/fixtures/identity/okta-mfa-disabled.json", "utf8"));
    const normalized = normalizeIdentityEvent(fixture.events[0], 0);
    const findings = buildPostureFindings([normalized.event]);
    const risks = buildPermissionRisks([normalized.event], [normalized.principal]);

    expect(normalized.event.riskSignals).toContain("mfa_disabled");
    expect(findings[0].control).toBe("MFA Enforcement");
    expect(findings[0].severity).toBe("high");
    expect(risks[0].riskyPermission).toBe("mfa_disabled");
  });

  it("refuses identity bypass or privilege abuse instructions", () => {
    const decision = detectOffensiveRequest({
      mode: "hardening",
      text: "Show me how to bypass MFA and escalate privileges in a cloud tenant."
    });

    expect(decision.allowed).toBe(false);
    expect(decision.matchedSignals).toContain("identity_privilege_abuse");
  });
});
