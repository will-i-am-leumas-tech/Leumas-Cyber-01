import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { searchCases } from "../search/search-index";
import type { CaseService } from "../services/case-service";

interface SearchRouteDeps {
  caseService: CaseService;
}

const searchQuerySchema = z.object({
  q: z.string().min(1)
});

export function registerSearchRoutes(app: FastifyInstance, deps: SearchRouteDeps): void {
  app.get("/search", async (request) => {
    const query = searchQuerySchema.parse(request.query);
    const caseItems = await deps.caseService.listCases();
    const cases = (
      await Promise.all(caseItems.map((item) => deps.caseService.getCase(item.id)))
    ).filter((item): item is NonNullable<typeof item> => Boolean(item));

    return {
      query: query.q,
      cases: searchCases(cases, query.q).map((cyberCase) => ({
        id: cyberCase.id,
        title: cyberCase.title,
        createdAt: cyberCase.createdAt,
        updatedAt: cyberCase.updatedAt,
        mode: cyberCase.mode,
        severity: cyberCase.severity,
        state: cyberCase.state,
        priority: cyberCase.priority,
        summary: cyberCase.summary
      }))
    };
  });
}
