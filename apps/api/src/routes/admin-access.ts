import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AuthorizationPolicyEngine } from "../auth/authorization-policy-engine";
import type { BreakGlassService } from "../auth/break-glass-service";
import type { ServiceAccountService } from "../auth/service-account-service";
import type { TenantService } from "../auth/tenant-service";
import {
  createBreakGlassGrantSchema,
  createServiceAccountSchema,
  reviewBreakGlassGrantSchema
} from "../schemas/auth-v2.schema";
import type { AuditService } from "../services/audit-service";

interface AdminAccessRouteDeps {
  auditService: AuditService;
  authorizationPolicyEngine: AuthorizationPolicyEngine;
  breakGlassService: BreakGlassService;
  serviceAccountService: ServiceAccountService;
  tenantService: TenantService;
}

const breakGlassParamsSchema = z.object({
  id: z.string().min(1)
});

export function registerAdminAccessRoutes(app: FastifyInstance, deps: AdminAccessRouteDeps): void {
  app.get("/admin/tenants", async () => ({
    tenants: await deps.tenantService.listTenants()
  }));

  app.post("/admin/service-accounts", async (request) => {
    const input = createServiceAccountSchema.parse(request.body);
    const result = await deps.serviceAccountService.create(input);
    const audit = await deps.auditService.record({
      action: "auth.service_account_created",
      summary: `Created scoped service account ${result.serviceAccount.name}.`,
      allowed: true,
      metadata: {
        serviceAccountId: result.serviceAccount.id,
        tenantId: result.serviceAccount.tenantId,
        scopes: result.serviceAccount.scopes,
        expiresAt: result.serviceAccount.expiresAt
      }
    });

    return {
      ...result,
      audit
    };
  });

  app.post("/admin/break-glass", async (request) => {
    const input = createBreakGlassGrantSchema.parse(request.body);
    const grant = await deps.breakGlassService.create(input);
    const audit = await deps.auditService.record({
      action: "auth.break_glass_requested",
      summary: `Break-glass access requested for ${grant.userId}.`,
      allowed: true,
      metadata: {
        grantId: grant.id,
        tenantId: grant.tenantId,
        expiresAt: grant.expiresAt
      }
    });

    return {
      breakGlassGrant: grant,
      audit
    };
  });

  app.post("/admin/break-glass/:id/review", async (request, reply) => {
    const params = breakGlassParamsSchema.parse(request.params);
    const input = reviewBreakGlassGrantSchema.parse(request.body);
    const grant = await deps.breakGlassService.review(params.id, input);
    if (!grant) {
      return reply.code(404).send({ error: "break_glass_grant_not_found" });
    }

    const audit = await deps.auditService.record({
      action: "auth.break_glass_reviewed",
      summary: `Break-glass access ${grant.reviewStatus} for ${grant.userId}.`,
      allowed: grant.reviewStatus === "approved",
      metadata: {
        grantId: grant.id,
        tenantId: grant.tenantId,
        approver: grant.approver,
        active: grant.active
      }
    });

    return {
      breakGlassGrant: grant,
      audit
    };
  });

  app.get("/admin/access-decisions", async () => ({
    accessDecisions: await deps.authorizationPolicyEngine.listDecisions()
  }));
}
