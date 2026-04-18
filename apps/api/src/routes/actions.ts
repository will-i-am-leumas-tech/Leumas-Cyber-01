import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { dryRunActionPlan, executeActionPlan } from "../actions/action-executor";
import { buildActionPlan } from "../actions/action-planner";
import { evaluateActionPlanPolicy, hasApprovedActionPlan } from "../actions/action-policy";
import { buildApprovalRequest } from "../actions/approval-service";
import { buildApprovalQueueItems } from "../collaboration/case-queue-service";
import { approvalDecisionSchema, createActionPlanSchema } from "../schemas/actions.schema";
import type { AuditService } from "../services/audit-service";
import type { CaseService } from "../services/case-service";
import { nowIso } from "../utils/time";

interface ActionRouteDeps {
  auditService: AuditService;
  caseService: CaseService;
}

const caseParamsSchema = z.object({
  id: z.string().min(1)
});

const actionPlanParamsSchema = z.object({
  id: z.string().min(1),
  planId: z.string().min(1)
});

const approvalsQuerySchema = z.object({
  includeResolved: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true")
});

export function registerActionRoutes(app: FastifyInstance, deps: ActionRouteDeps): void {
  app.get("/approvals", async (request) => {
    const query = approvalsQuerySchema.parse(request.query);
    const items = buildApprovalQueueItems(await deps.caseService.listFullCases());
    return {
      approvals: query.includeResolved ? items : items.filter((item) => item.status === "pending")
    };
  });

  app.get("/cases/:id/actions", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    return {
      actionPlans: cyberCase.actionPlans,
      approvalRequests: cyberCase.approvalRequests,
      actionExecutions: cyberCase.actionExecutions
    };
  });

  app.post("/cases/:id/action-plans", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const input = createActionPlanSchema.parse(request.body);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const plan = buildActionPlan({
      caseId: params.id,
      index: cyberCase.actionPlans.length + 1,
      plan: input
    });
    const policy = evaluateActionPlanPolicy(plan);
    if (!policy.allowed) {
      plan.status = "blocked";
    }
    cyberCase.actionPlans.push(plan);
    cyberCase.updatedAt = nowIso();

    const audit = await deps.auditService.record({
      caseId: params.id,
      action: policy.allowed ? "action.plan_created" : "action.plan_blocked",
      summary: policy.allowed ? `Action plan created: ${plan.objective}.` : `Action plan blocked: ${policy.reason}.`,
      allowed: policy.allowed,
      metadata: {
        actionPlanId: plan.id,
        reason: policy.reason
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    if (!policy.allowed) {
      return reply.code(403).send({
        error: "action_plan_blocked",
        reason: policy.reason,
        actionPlan: plan
      });
    }

    return {
      actionPlan: plan,
      case: cyberCase
    };
  });

  app.post("/cases/:id/action-plans/:planId/dry-run", async (request, reply) => {
    const params = actionPlanParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const planIndex = cyberCase.actionPlans.findIndex((plan) => plan.id === params.planId);
    if (planIndex === -1) {
      return reply.code(404).send({ error: "action_plan_not_found" });
    }

    const dryRunPlan = dryRunActionPlan(cyberCase.actionPlans[planIndex]);
    cyberCase.actionPlans[planIndex] = dryRunPlan;
    cyberCase.updatedAt = nowIso();
    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "action.dry_run_completed",
      summary: `Dry run completed for action plan ${dryRunPlan.id}.`,
      allowed: true,
      metadata: {
        actionPlanId: dryRunPlan.id
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      actionPlan: dryRunPlan
    };
  });

  app.post("/cases/:id/action-plans/:planId/approval", async (request, reply) => {
    const params = actionPlanParamsSchema.parse(request.params);
    const input = approvalDecisionSchema.parse(request.body);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const plan = cyberCase.actionPlans.find((candidate) => candidate.id === params.planId);
    if (!plan) {
      return reply.code(404).send({ error: "action_plan_not_found" });
    }

    const approval = buildApprovalRequest({
      index: cyberCase.approvalRequests.length + 1,
      actionPlanId: params.planId,
      approverRole: input.approverRole,
      requestedBy: input.requestedBy,
      status: input.status,
      reason: input.reason,
      decidedBy: input.decidedBy
    });
    cyberCase.approvalRequests.push(approval);
    if (approval.status === "approved") {
      const planIndex = cyberCase.actionPlans.findIndex((candidate) => candidate.id === params.planId);
      cyberCase.actionPlans[planIndex] = {
        ...plan,
        status: "approved",
        updatedAt: nowIso(),
        steps: plan.steps.map((step) => (step.approvalRequired ? { ...step, status: "approved" } : step))
      };
    }
    cyberCase.updatedAt = nowIso();

    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "action.approval_recorded",
      summary: `Action approval ${approval.status}: ${approval.reason}.`,
      allowed: approval.status !== "rejected",
      metadata: {
        actionPlanId: params.planId,
        approvalId: approval.id,
        approverRole: approval.approverRole
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      approval,
      case: cyberCase
    };
  });

  app.post("/cases/:id/action-plans/:planId/execute", async (request, reply) => {
    const params = actionPlanParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const planIndex = cyberCase.actionPlans.findIndex((plan) => plan.id === params.planId);
    if (planIndex === -1) {
      return reply.code(404).send({ error: "action_plan_not_found" });
    }

    const plan = cyberCase.actionPlans[planIndex];
    if (!hasApprovedActionPlan(plan, cyberCase.approvalRequests)) {
      const audit = await deps.auditService.record({
        caseId: params.id,
        action: "action.execution_blocked",
        summary: "Action execution blocked because required approval is missing.",
        allowed: false,
        metadata: {
          actionPlanId: plan.id
        }
      });
      cyberCase.auditEntries.push(audit);
      await deps.caseService.saveCase(cyberCase);
      return reply.code(409).send({
        error: "approval_required",
        reason: "High-risk action plans require approval before execution."
      });
    }

    const execution = executeActionPlan({
      plan,
      startingIndex: cyberCase.actionExecutions.length + 1
    });
    cyberCase.actionPlans[planIndex] = execution.plan;
    cyberCase.actionExecutions.push(...execution.executions);
    cyberCase.updatedAt = nowIso();
    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "action.execution_completed",
      summary: `Executed action plan ${plan.id} with ${execution.executions.length} step${execution.executions.length === 1 ? "" : "s"}.`,
      allowed: true,
      metadata: {
        actionPlanId: plan.id,
        executionIds: execution.executions.map((item) => item.id)
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      actionPlan: execution.plan,
      actionExecutions: execution.executions,
      case: cyberCase
    };
  });
}
