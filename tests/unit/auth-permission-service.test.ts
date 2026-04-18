import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { canAccessCase } from "../../apps/api/src/auth/case-access-service";
import { hasPermission } from "../../apps/api/src/auth/permission-service";
import type { CaseMembership, User } from "../../apps/api/src/schemas/auth.schema";

describe("auth permission services", () => {
  it("grants and denies expected role matrix permissions", async () => {
    const roleMatrix = JSON.parse(await readFile("data/fixtures/auth/role-matrix.json", "utf8")) as Record<string, string[]>;

    expect(roleMatrix.admin).toContain("audit:read");
    expect(hasPermission({ roles: ["admin"], resource: "audit", action: "read" })).toBe(true);
    expect(hasPermission({ roles: ["analyst"], resource: "audit", action: "read" })).toBe(false);
    expect(hasPermission({ roles: ["responder"], resource: "tool", action: "execute", caseMember: true })).toBe(true);
    expect(hasPermission({ roles: ["responder"], resource: "tool", action: "execute", caseMember: false })).toBe(false);
  });

  it("restricts case access to members unless role has global case read", async () => {
    const users = JSON.parse(await readFile("data/fixtures/auth/users.json", "utf8")) as User[];
    const memberships = JSON.parse(await readFile("data/fixtures/auth/case-memberships.json", "utf8")) as CaseMembership[];
    const analyst = users.find((user) => user.id === "user_analyst") as User;
    const auditor = users.find((user) => user.id === "user_auditor") as User;

    expect(
      canAccessCase({
        user: analyst,
        roles: analyst.roles,
        caseId: "case_auth_fixture",
        memberships,
        action: "read"
      })
    ).toBe(true);
    expect(
      canAccessCase({
        user: analyst,
        roles: analyst.roles,
        caseId: "case_other",
        memberships,
        action: "read"
      })
    ).toBe(false);
    expect(
      canAccessCase({
        user: auditor,
        roles: auditor.roles,
        caseId: "case_other",
        memberships,
        action: "read"
      })
    ).toBe(true);
  });
});
