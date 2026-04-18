import type { FastifyInstance } from "fastify";
import type { ErrorReporter } from "../observability/error-reporter";
import type { HealthService } from "../observability/health-service";
import type { MetricsService } from "../observability/metrics-service";
import type { InMemoryJobQueue } from "../jobs/job-queue";

interface ObservabilityRouteDeps {
  errorReporter: ErrorReporter;
  healthService: HealthService;
  jobQueue: InMemoryJobQueue;
  metricsService: MetricsService;
}

export function registerObservabilityRoutes(app: FastifyInstance, deps: ObservabilityRouteDeps): void {
  app.get("/metrics", async () => ({
    metrics: deps.metricsService.snapshot()
  }));

  app.get("/health/dependencies", async () => ({
    dependencies: await deps.healthService.checkDependencies()
  }));

  app.get("/admin/errors", async () => ({
    errors: deps.errorReporter.list()
  }));

  app.get("/admin/jobs", async () => ({
    jobs: deps.jobQueue.list()
  }));
}
