import path from "node:path";
import type { Permission, PermissionAction, PermissionResource } from "../schemas/auth.schema";
import { accessDecisionSchema, type AccessDecision } from "../schemas/auth-v2.schema";
import { ensureDir, readJsonFile, writeJsonFile } from "../utils/files";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export const accessPolicyVersion = "access-policy-v2-2026-04-18";

interface AccessDecisionState {
  decisions: AccessDecision[];
}

export interface AccessEvaluationInput {
  subjectId: string;
  subjectType: AccessDecision["subjectType"];
  tenantIds: string[];
  activeTenantId?: string;
  permissions: Permission[];
  resource: PermissionResource;
  action: PermissionAction;
  resourceId?: string;
  resourceTenantId?: string;
  caseMember?: boolean;
  serviceScopes?: string[];
  activeBreakGlassTenantIds?: string[];
}

function actionMatches(granted: PermissionAction, requested: PermissionAction): boolean {
  return granted === requested || granted === "manage";
}

function scopeMatches(scopes: string[] | undefined, resource: PermissionResource, action: PermissionAction): boolean {
  return Boolean(scopes?.includes(`${resource}:${action}`) || scopes?.includes(`${resource}:manage`) || scopes?.includes("*"));
}

export function evaluateAccessPolicy(input: AccessEvaluationInput): Omit<AccessDecision, "id" | "createdAt"> {
  const tenantId = input.resourceTenantId ?? input.activeTenantId;
  const breakGlassAllowed = Boolean(tenantId && input.activeBreakGlassTenantIds?.includes(tenantId));
  const tenantAllowed = !tenantId || input.tenantIds.includes(tenantId) || breakGlassAllowed;
  if (!tenantAllowed) {
    return {
      subjectId: input.subjectId,
      subjectType: input.subjectType,
      tenantId,
      resource: input.resource,
      action: input.action,
      resourceId: input.resourceId,
      allowed: false,
      reason: "Tenant boundary denied the request.",
      policyVersion: accessPolicyVersion
    };
  }

  if (scopeMatches(input.serviceScopes, input.resource, input.action)) {
    return {
      subjectId: input.subjectId,
      subjectType: input.subjectType,
      tenantId,
      resource: input.resource,
      action: input.action,
      resourceId: input.resourceId,
      allowed: true,
      reason: "Service account scope allowed the request.",
      policyVersion: accessPolicyVersion
    };
  }

  const roleAllowed = input.permissions.some((permission) => {
    if (permission.resource !== input.resource || !actionMatches(permission.action, input.action)) {
      return false;
    }
    return permission.condition === "global" || Boolean(input.caseMember) || breakGlassAllowed;
  });

  return {
    subjectId: input.subjectId,
    subjectType: input.subjectType,
    tenantId,
    resource: input.resource,
    action: input.action,
    resourceId: input.resourceId,
    allowed: roleAllowed,
    reason: roleAllowed ? "RBAC, ABAC, membership, and tenant policy allowed the request." : "Missing required permission.",
    policyVersion: accessPolicyVersion
  };
}

export class AuthorizationPolicyEngine {
  constructor(private readonly dataDir: string) {}

  private statePath(): string {
    return path.join(this.dataDir, "auth-v2", "access-decisions.json");
  }

  private async readState(): Promise<AccessDecisionState> {
    try {
      const state = await readJsonFile<AccessDecisionState>(this.statePath());
      return {
        decisions: state.decisions.map((decision) => accessDecisionSchema.parse(decision))
      };
    } catch {
      return { decisions: [] };
    }
  }

  private async writeState(state: AccessDecisionState): Promise<void> {
    await ensureDir(path.dirname(this.statePath()));
    await writeJsonFile(this.statePath(), state);
  }

  async evaluate(input: AccessEvaluationInput): Promise<AccessDecision> {
    const decision = accessDecisionSchema.parse({
      ...evaluateAccessPolicy(input),
      id: createId("access_decision"),
      createdAt: nowIso()
    });
    const state = await this.readState();
    state.decisions.push(decision);
    await this.writeState(state);
    return decision;
  }

  async listDecisions(): Promise<AccessDecision[]> {
    return (await this.readState()).decisions;
  }
}
