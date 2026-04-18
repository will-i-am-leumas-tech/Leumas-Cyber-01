import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ingestKnowledgeSourceSchema, retrievalQuerySchema } from "../schemas/knowledge.schema";
import { patchKnowledgeApprovalSchema } from "../schemas/knowledge-v2.schema";
import type { KnowledgeService } from "../knowledge/ingest-service";

interface KnowledgeRouteDeps {
  knowledgeService: KnowledgeService;
}

const knowledgeSourceParamsSchema = z.object({
  id: z.string().min(1)
});

const citationParamsSchema = z.object({
  id: z.string().min(1)
});

export function registerKnowledgeRoutes(app: FastifyInstance, deps: KnowledgeRouteDeps): void {
  app.post("/knowledge/sources", async (request) => {
    const input = ingestKnowledgeSourceSchema.parse(request.body);
    const result = await deps.knowledgeService.ingestSource(input);
    return {
      source: result.source,
      chunks: result.chunks
    };
  });

  app.get("/knowledge/sources", async () => ({
    sources: await deps.knowledgeService.listSources()
  }));

  app.get("/knowledge/source-records", async () => ({
    sourceRecords: await deps.knowledgeService.listSourceRecords()
  }));

  app.patch("/knowledge/sources/:id/approval", async (request, reply) => {
    const params = knowledgeSourceParamsSchema.parse(request.params);
    const input = patchKnowledgeApprovalSchema.parse(request.body);
    const result = await deps.knowledgeService.updateSourceApproval(params.id, input);
    if (!result) {
      return reply.code(404).send({ error: "knowledge_source_not_found" });
    }

    return result;
  });

  app.get("/knowledge/sources/:id/approvals", async (request) => {
    const params = knowledgeSourceParamsSchema.parse(request.params);
    return {
      approvals: await deps.knowledgeService.listApprovals(params.id)
    };
  });

  app.get("/knowledge/sources/:id/freshness", async (request, reply) => {
    const params = knowledgeSourceParamsSchema.parse(request.params);
    const result = await deps.knowledgeService.getFreshness(params.id);
    if (!result) {
      return reply.code(404).send({ error: "knowledge_source_not_found" });
    }

    return result;
  });

  app.get("/knowledge/sources/:id/taxonomy", async (request) => {
    const params = knowledgeSourceParamsSchema.parse(request.params);
    return {
      mappings: await deps.knowledgeService.listTaxonomyMappings(params.id)
    };
  });

  app.post("/knowledge/search", async (request) => {
    const query = retrievalQuerySchema.parse(request.body);
    return {
      results: await deps.knowledgeService.search(query)
    };
  });

  app.post("/knowledge/search/hybrid", async (request) => {
    const query = retrievalQuerySchema.parse(request.body);
    return {
      results: await deps.knowledgeService.search(query)
    };
  });

  app.get("/knowledge/citations/:id/quality", async (request, reply) => {
    const params = citationParamsSchema.parse(request.params);
    const quality = await deps.knowledgeService.getCitationQuality(params.id);
    if (!quality) {
      return reply.code(404).send({ error: "knowledge_citation_not_found" });
    }

    return { citationQuality: quality };
  });
}
