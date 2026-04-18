import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { checkSecurityConnectorHealth } from "../connectors/connector-health-service";
import { getSecurityConnector, listSecurityConnectors } from "../connectors/connector-registry-v2";
import { evaluateConnectorPolicy } from "../connectors/connector-policy";
import { connectorEvidenceRefSchema, connectorQueryRequestSchema } from "../schemas/connectors.schema";
import type { AuditService } from "../services/audit-service";
import type { CaseService } from "../services/case-service";
import { sha256Text } from "../reasoning/hash";
import { createId } from "../utils/ids";

interface ConnectorRouteDeps {
  auditService: AuditService;
  caseService: CaseService;
}

const connectorParamsSchema = z.object({
  connectorId: z.string().min(1)
});

const caseConnectorParamsSchema = z.object({
  id: z.string().min(1),
  connectorId: z.string().min(1)
});

function dataClassForConnector(dataClasses: Array<"public" | "internal" | "confidential" | "restricted">): "public" | "internal" | "confidential" | "restricted" {
  if (dataClasses.includes("restricted")) {
    return "restricted";
  }
  if (dataClasses.includes("confidential")) {
    return "confidential";
  }
  if (dataClasses.includes("internal")) {
    return "internal";
  }
  return "public";
}

export function registerConnectorRoutes(app: FastifyInstance, deps: ConnectorRouteDeps): void {
  app.get("/connectors", async () => ({
    connectors: listSecurityConnectors()
  }));

  app.get("/connectors/health", async () => ({
    connectors: await checkSecurityConnectorHealth()
  }));

  app.post("/connectors/:connectorId/query", async (request, reply) => {
    const params = connectorParamsSchema.parse(request.params);
    const connector = getSecurityConnector(params.connectorId);
    const query = connectorQueryRequestSchema.parse(request.body ?? {});
    const policy = evaluateConnectorPolicy({
      definition: connector?.definition,
      request: query
    });

    if (!policy.allowed) {
      await deps.auditService.record({
        action: "connector.query_denied",
        summary: `Connector query denied: ${policy.reason}.`,
        allowed: false,
        metadata: {
          connectorId: params.connectorId,
          operation: query.operation,
          actor: query.actor,
          reason: policy.reason
        }
      });
      return reply.code(403).send({
        error: "connector_query_denied",
        reason: policy.reason
      });
    }

    if (!connector) {
      return reply.code(404).send({ error: "connector_not_found" });
    }

    const result = await connector.query(query);
    await deps.auditService.record({
      action: "connector.query_completed",
      summary: result.summary,
      allowed: true,
      metadata: {
        connectorId: connector.definition.id,
        operation: query.operation,
        actor: query.actor,
        recordCount: result.records.length
      }
    });

    return {
      connector: connector.definition,
      policy,
      result
    };
  });

  app.post("/cases/:id/connectors/:connectorId/import", async (request, reply) => {
    const params = caseConnectorParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const connector = getSecurityConnector(params.connectorId);
    const query = connectorQueryRequestSchema.parse(request.body ?? {});
    const policy = evaluateConnectorPolicy({
      definition: connector?.definition,
      request: query
    });

    if (!policy.allowed) {
      const audit = await deps.auditService.record({
        caseId: params.id,
        action: "connector.import_denied",
        summary: `Connector import denied: ${policy.reason}.`,
        allowed: false,
        metadata: {
          connectorId: params.connectorId,
          operation: query.operation,
          actor: query.actor,
          reason: policy.reason
        }
      });
      cyberCase.auditEntries.push(audit);
      await deps.caseService.saveCase(cyberCase);
      return reply.code(403).send({
        error: "connector_import_denied",
        reason: policy.reason
      });
    }

    if (!connector) {
      return reply.code(404).send({ error: "connector_not_found" });
    }

    const result = await connector.query(query);
    const dataClass = dataClassForConnector(connector.definition.dataClasses);
    const evidenceRefs = result.records.map((record, index) =>
      connectorEvidenceRefSchema.parse({
        id: createId("connector_evidence"),
        caseId: params.id,
        connectorId: connector.definition.id,
        source: connector.definition.name,
        externalId: result.recordRefs[index] ?? `record_${index + 1}`,
        retrievedAt: result.retrievedAt,
        recordHash: sha256Text(JSON.stringify(record)),
        dataClass,
        summary: `${connector.definition.name} ${query.operation} record ${result.recordRefs[index] ?? index + 1}.`
      })
    );

    cyberCase.connectorEvidenceRefs.push(...evidenceRefs);
    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "connector.evidence_imported",
      summary: `Imported ${evidenceRefs.length} read-only connector evidence record${evidenceRefs.length === 1 ? "" : "s"} from ${connector.definition.name}.`,
      allowed: true,
      metadata: {
        connectorId: connector.definition.id,
        operation: query.operation,
        actor: query.actor,
        evidenceRefIds: evidenceRefs.map((ref) => ref.id),
        recordRefs: result.recordRefs,
        dataClass
      }
    });
    cyberCase.auditEntries.push(audit);
    await deps.caseService.saveCase(cyberCase);

    return {
      connector: connector.definition,
      result,
      evidenceRefs,
      case: cyberCase
    };
  });
}
