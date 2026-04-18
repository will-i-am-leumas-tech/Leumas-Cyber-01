import type { FastifyInstance } from "fastify";

export function registerHealthRoutes(app: FastifyInstance): void {
  app.get("/health", async () => ({
    ok: true,
    service: "leumas-defensive-cyber-agent-api",
    timestamp: new Date().toISOString()
  }));
}
