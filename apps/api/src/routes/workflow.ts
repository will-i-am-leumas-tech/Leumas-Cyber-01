import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildWorkflowTransition, validateCaseStateTransition } from "../workflow/case-state-machine";
import { buildDecisionRecord } from "../workflow/decision-service";
import type { AuditService } from "../services/audit-service";
import type { CaseService } from "../services/case-service";
import { caseStateSchema, decisionTypeSchema, taskStatusSchema, workflowPrioritySchema } from "../schemas/workflow.schema";
import { nowIso } from "../utils/time";

interface WorkflowRouteDeps {
  auditService: AuditService;
  caseService: CaseService;
}

const caseParamsSchema = z.object({
  id: z.string().min(1)
});

const taskParamsSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1)
});

const stateUpdateSchema = z.object({
  state: caseStateSchema,
  actor: z.string().min(1).default("analyst"),
  reason: z.string().min(1).default("Workflow state updated.")
});

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  owner: z.string().optional(),
  priority: workflowPrioritySchema.optional(),
  dueAt: z.string().optional(),
  linkedFindingIds: z.array(z.string()).optional(),
  required: z.boolean().optional()
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  owner: z.string().optional(),
  priority: workflowPrioritySchema.optional(),
  status: taskStatusSchema.optional(),
  dueAt: z.string().optional(),
  linkedFindingIds: z.array(z.string()).optional(),
  required: z.boolean().optional()
});

const decisionSchema = z.object({
  decisionType: decisionTypeSchema.default("note"),
  decision: z.string().min(1),
  rationale: z.string().min(1),
  approver: z.string().min(1).default("analyst"),
  evidenceRefs: z.array(z.string()).optional()
});

export function registerWorkflowRoutes(app: FastifyInstance, deps: WorkflowRouteDeps): void {
  app.get("/cases/:id/workflow", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    return {
      state: cyberCase.state,
      priority: cyberCase.priority,
      assignedTo: cyberCase.assignedTo,
      tags: cyberCase.tags,
      tasks: cyberCase.tasks,
      decisions: cyberCase.decisions,
      workflowTransitions: cyberCase.workflowTransitions
    };
  });

  app.post("/cases/:id/state", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const input = stateUpdateSchema.parse(request.body);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const validation = validateCaseStateTransition({
      from: cyberCase.state,
      to: input.state,
      tasks: cyberCase.tasks,
      decisions: cyberCase.decisions
    });
    if (!validation.allowed) {
      return reply.code(409).send({
        error: "invalid_workflow_transition",
        reason: validation.reason
      });
    }

    const transition = buildWorkflowTransition({
      index: cyberCase.workflowTransitions.length + 1,
      from: cyberCase.state,
      to: input.state,
      actor: input.actor,
      reason: input.reason
    });
    cyberCase.state = input.state;
    cyberCase.workflowTransitions.push(transition);
    cyberCase.updatedAt = nowIso();

    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "workflow.state_updated",
      summary: `Case state changed from ${transition.from} to ${transition.to}.`,
      allowed: true,
      metadata: {
        actor: input.actor,
        reason: input.reason
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      case: cyberCase,
      transition
    };
  });

  app.post("/cases/:id/tasks", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const input = createTaskSchema.parse(request.body);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const timestamp = nowIso();
    const task = {
      id: `task_${String(cyberCase.tasks.length + 1).padStart(3, "0")}`,
      title: input.title,
      description: input.description,
      owner: input.owner,
      priority: input.priority ?? cyberCase.priority,
      status: "open" as const,
      dueAt: input.dueAt,
      linkedFindingIds: input.linkedFindingIds ?? [],
      required: input.required ?? true,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    cyberCase.tasks.push(task);
    cyberCase.updatedAt = timestamp;
    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "workflow.task_created",
      summary: `Task created: ${task.title}.`,
      allowed: true,
      metadata: {
        taskId: task.id
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      case: cyberCase,
      task
    };
  });

  app.patch("/cases/:id/tasks/:taskId", async (request, reply) => {
    const params = taskParamsSchema.parse(request.params);
    const input = updateTaskSchema.parse(request.body);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const taskIndex = cyberCase.tasks.findIndex((task) => task.id === params.taskId);
    if (taskIndex === -1) {
      return reply.code(404).send({ error: "task_not_found" });
    }

    const updatedTask = {
      ...cyberCase.tasks[taskIndex],
      ...input,
      updatedAt: nowIso()
    };
    cyberCase.tasks[taskIndex] = updatedTask;
    cyberCase.updatedAt = updatedTask.updatedAt;
    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "workflow.task_updated",
      summary: `Task updated: ${updatedTask.title}.`,
      allowed: true,
      metadata: {
        taskId: updatedTask.id,
        status: updatedTask.status
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      case: cyberCase,
      task: updatedTask
    };
  });

  app.post("/cases/:id/decisions", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const input = decisionSchema.parse(request.body);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const decision = buildDecisionRecord({
      index: cyberCase.decisions.length + 1,
      ...input
    });
    cyberCase.decisions.push(decision);
    cyberCase.updatedAt = nowIso();
    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "workflow.decision_recorded",
      summary: `Decision recorded: ${decision.decision}.`,
      allowed: true,
      metadata: {
        decisionId: decision.id,
        decisionType: decision.decisionType,
        approver: decision.approver
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      case: cyberCase,
      decision
    };
  });
}
