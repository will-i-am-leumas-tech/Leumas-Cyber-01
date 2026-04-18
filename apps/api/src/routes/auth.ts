import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getAuthContext } from "../auth/auth-context";
import type { AuthService } from "../auth/auth-service";
import { roles, rolePermissions } from "../auth/permission-service";
import { roleIdSchema } from "../schemas/auth.schema";
import type { AuditService } from "../services/audit-service";
import type { CaseService } from "../services/case-service";

interface AuthRouteDeps {
  authRequired: boolean;
  auditService: AuditService;
  authService: AuthService;
  caseService: CaseService;
}

const devLoginBodySchema = z.object({
  user: z.string().min(1)
});

const caseParamsSchema = z.object({
  id: z.string().min(1)
});

const caseMemberBodySchema = z.object({
  userId: z.string().min(1),
  role: roleIdSchema,
  teamId: z.string().optional()
});

export function registerAuthRoutes(app: FastifyInstance, deps: AuthRouteDeps): void {
  app.get("/auth/me", async (request, reply) => {
    const context = getAuthContext(request);
    if (!context && deps.authRequired) {
      return reply.code(401).send({ error: "authentication_required" });
    }

    return {
      authRequired: deps.authRequired,
      user: context?.user,
      roles: context?.roles ?? [],
      permissions: context?.permissions ?? [],
      tenantIds: context?.tenantIds ?? [],
      activeTenantId: context?.activeTenantId,
      attributes: context?.attributes ?? {},
      scopes: context?.scopes ?? [],
      activeBreakGlassTenantIds: context?.activeBreakGlassTenantIds ?? []
    };
  });

  app.post("/auth/dev-login", async (request, reply) => {
    const body = devLoginBodySchema.parse(request.body);
    const user = await deps.authService.getUser(body.user);
    if (!user || user.status !== "active") {
      return reply.code(401).send({ error: "invalid_dev_user" });
    }

    return {
      user,
      header: {
        name: "x-dev-user",
        value: user.email
      },
      roles: user.roles,
      tenantIds: user.tenantIds,
      attributes: user.attributes,
      groups: user.groups,
      permissions: rolePermissions.filter((permission) => user.roles.includes(permission.role))
    };
  });

  app.get("/auth/roles", async () => ({
    roles,
    permissions: rolePermissions
  }));

  app.get("/cases/:id/members", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    return {
      members: await deps.authService.listMemberships(params.id)
    };
  });

  app.post("/cases/:id/members", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const input = caseMemberBodySchema.parse(request.body);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }
    const user = await deps.authService.getUser(input.userId);
    if (!user) {
      return reply.code(404).send({ error: "user_not_found" });
    }

    const membership = await deps.authService.upsertMembership({
      caseId: params.id,
      userId: user.id,
      role: input.role,
      teamId: input.teamId
    });
    const actor = getAuthContext(request)?.user.email ?? "system";
    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "auth.case_member_upserted",
      summary: `Case membership set for ${user.email}.`,
      allowed: true,
      metadata: {
        actor,
        userId: user.id,
        role: input.role,
        teamId: input.teamId
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      member: membership,
      case: cyberCase
    };
  });
}
