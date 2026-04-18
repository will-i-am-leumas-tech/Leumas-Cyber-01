import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { InMemoryJobQueue } from "../jobs/job-queue";

interface JobRouteDeps {
  jobQueue: InMemoryJobQueue;
}

const jobParamsSchema = z.object({
  id: z.string().min(1)
});

const createJobSchema = z.object({
  type: z.string().min(1),
  payload: z.record(z.unknown()).default({}),
  maxAttempts: z.number().int().positive().max(10).default(3)
});

export function registerJobRoutes(app: FastifyInstance, deps: JobRouteDeps): void {
  app.post("/jobs", async (request) => {
    const input = createJobSchema.parse(request.body);
    return {
      job: deps.jobQueue.enqueue(input)
    };
  });

  app.get("/jobs/:id", async (request, reply) => {
    const params = jobParamsSchema.parse(request.params);
    const job = deps.jobQueue.get(params.id);
    if (!job) {
      return reply.code(404).send({ error: "job_not_found" });
    }
    return {
      job
    };
  });
}
