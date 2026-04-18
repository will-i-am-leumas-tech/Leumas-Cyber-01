import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateAccessPolicy } from "../../apps/api/src/auth/authorization-policy-engine";
import { principalFromOidcClaims } from "../../apps/api/src/auth/oidc-auth-provider";
import { permissionsForRoles } from "../../apps/api/src/auth/permission-service";
import { ServiceAccountService } from "../../apps/api/src/auth/service-account-service";

describe("access control v2 services", () => {
  it("maps OIDC claims into tenant-aware principals", () => {
    const principal = principalFromOidcClaims({
      sub: "user-123",
      email: "oidc-user@example.test",
      roles: ["analyst", "unknown-role"],
      groups: ["secops"],
      tenant_ids: ["tenant_default"],
      attributes: {
        department: "security"
      }
    });

    expect(principal).toMatchObject({
      email: "oidc-user@example.test",
      tenantIds: ["tenant_default"],
      roles: ["analyst"],
      groups: ["secops"],
      provider: "oidc"
    });
  });

  it("denies tenant boundary violations and allows reviewed emergency tenant access", () => {
    const denied = evaluateAccessPolicy({
      subjectId: "user_partner",
      subjectType: "user",
      tenantIds: ["tenant_partner"],
      permissions: permissionsForRoles(["analyst"]),
      resource: "case",
      action: "read",
      resourceId: "case_default",
      resourceTenantId: "tenant_default",
      caseMember: true
    });
    const allowed = evaluateAccessPolicy({
      subjectId: "user_partner",
      subjectType: "user",
      tenantIds: ["tenant_partner"],
      permissions: permissionsForRoles(["analyst"]),
      resource: "case",
      action: "read",
      resourceId: "case_default",
      resourceTenantId: "tenant_default",
      activeBreakGlassTenantIds: ["tenant_default"]
    });

    expect(denied.allowed).toBe(false);
    expect(denied.reason).toContain("Tenant boundary");
    expect(allowed.allowed).toBe(true);
  });

  it("creates expiring scoped service accounts without storing issued credentials", async () => {
    const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-service-account-"));
    const service = new ServiceAccountService(dataDir);
    const result = await service.create({
      tenantId: "tenant_default",
      name: "CI Reader",
      owner: "platform",
      scopes: ["case:read"],
      expiresAt: "2026-12-31T00:00:00.000Z"
    });

    expect(result.issuedCredential).toMatch(/^svc_/);
    expect(result.serviceAccount.tokenHash).not.toBe(result.issuedCredential);
    expect((await service.list())[0]).toMatchObject({
      tenantId: "tenant_default",
      scopes: ["case:read"],
      status: "active"
    });
  });
});
