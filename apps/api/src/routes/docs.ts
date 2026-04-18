import type { FastifyInstance } from "fastify";
import { openApiDocument } from "../docs/openapi-document";

export function registerDocsRoutes(app: FastifyInstance): void {
  app.get("/docs/openapi.json", async () => openApiDocument);
}
