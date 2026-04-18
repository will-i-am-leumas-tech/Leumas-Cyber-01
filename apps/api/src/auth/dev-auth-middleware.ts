import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AuthService } from "./auth-service";
import type { AuthorizationPolicyEngine } from "./authorization-policy-engine";
import type { BreakGlassService } from "./break-glass-service";
import { canAccessCase } from "./case-access-service";
import { permissionsForRoles, hasPermission } from "./permission-service";
import { routePermission } from "./route-permission-map";
import { setAuthContext } from "./auth-context";
import type { User } from "../schemas/auth.schema";
import type { CaseService } from "../services/case-service";
import { createId } from "../utils/ids";

interface DevAuthOptions {
  authService: AuthService;
  authorizationPolicyEngine?: AuthorizationPolicyEngine;
  breakGlassService?: BreakGlassService;
  caseService?: CaseService;
  required?: boolean;
}

const publicPaths = new Set(["/health", "/auth/dev-login"]);

function headerValue(request: FastifyRequest, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function caseIdFromRequest(request: FastifyRequest): string | undefined {
  const params = request.params as { id?: unknown } | undefined;
  return typeof params?.id === "string" ? params.id : undefined;
}

async function resolveUser(request: FastifyRequest, authService: AuthService, required: boolean): Promise<User | null> {
  const userRef = headerValue(request, "x-dev-user") ?? headerValue(request, "x-user-id");
  if (userRef) {
    return authService.getUser(userRef);
  }
  if (!required) {
    return authService.getUser("admin@example.test");
  }
  return null;
}

function deny(reply: FastifyReply, statusCode: number, error: string, reason: string): FastifyReply {
  return reply.code(statusCode).send({ error, reason });
}

export function registerDevAuthMiddleware(app: FastifyInstance, options: DevAuthOptions): void {
  const required = options.required ?? false;

  app.addHook("preHandler", async (request, reply) => {
    const url = request.url.split("?")[0];
    const user = await resolveUser(request, options.authService, required);
    if (!user) {
      if (!required || publicPaths.has(url)) {
        return;
      }
      return deny(reply, 401, "authentication_required", "Set x-dev-user to an active local dev user.");
    }
    if (user.status !== "active") {
      return deny(reply, 403, "user_disabled", "The authenticated user is disabled.");
    }

    const memberships = await options.authService.listMemberships();
    const contextRoles = user.roles;
    const activeBreakGlass = (await options.breakGlassService?.activeForUser(user.id)) ?? [];
    const tenantIds = user.tenantIds.length > 0 ? user.tenantIds : ["tenant_default"];
    setAuthContext(request, {
      user,
      roles: contextRoles,
      permissions: permissionsForRoles(contextRoles),
      tenantIds,
      activeTenantId: tenantIds[0],
      attributes: user.attributes,
      scopes: [],
      activeBreakGlassTenantIds: activeBreakGlass.map((grant) => grant.tenantId),
      requestId: createId("request")
    });

    if (!required || publicPaths.has(url)) {
      return;
    }

    const needed = routePermission(request);
    if (!needed) {
      return;
    }

    const caseId = caseIdFromRequest(request);
    const cyberCase = caseId ? await options.caseService?.getCase(caseId) : null;
    const membership = caseId ? memberships.find((item) => item.caseId === caseId && item.userId === user.id) : undefined;
    const effectiveRoles = membership ? [...new Set([...contextRoles, membership.role])] : contextRoles;
    const decision = await options.authorizationPolicyEngine?.evaluate({
      subjectId: user.id,
      subjectType: "user",
      tenantIds,
      activeTenantId: tenantIds[0],
      permissions: permissionsForRoles(effectiveRoles),
      resource: needed.resource,
      action: needed.action,
      resourceId: caseId,
      resourceTenantId: cyberCase?.tenantId,
      caseMember: Boolean(membership),
      activeBreakGlassTenantIds: activeBreakGlass.map((grant) => grant.tenantId)
    });
    const allowed = decision
      ? decision.allowed
      : caseId && needed.resource === "case"
        ? canAccessCase({
            user,
            roles: contextRoles,
            caseId,
            memberships,
            action: needed.action,
            caseTenantId: cyberCase?.tenantId,
            activeBreakGlassTenantIds: activeBreakGlass.map((grant) => grant.tenantId)
          })
        : hasPermission({
            roles: effectiveRoles,
            resource: needed.resource,
            action: needed.action,
            caseMember: Boolean(membership)
          });

    if (!allowed) {
      return deny(reply, 403, "permission_denied", decision?.reason ?? `Missing ${needed.resource}:${needed.action} permission.`);
    }
  });
}
