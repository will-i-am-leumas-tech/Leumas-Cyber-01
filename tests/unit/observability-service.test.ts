import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { ErrorReporter } from "../../apps/api/src/observability/error-reporter";
import { HealthService } from "../../apps/api/src/observability/health-service";
import { MetricsService } from "../../apps/api/src/observability/metrics-service";
import { nextBackoffMs, shouldRetry } from "../../apps/api/src/observability/retry-policy";
import type { CyberModelProvider } from "../../apps/api/src/providers/base-provider";
import type { StorageAdapter } from "../../apps/api/src/storage/storage-adapter";

describe("observability services", () => {
  it("increments metrics by name and label set", () => {
    const metrics = new MetricsService();
    metrics.increment("analysis_requests_total", { mode: "logs" });
    metrics.increment("analysis_requests_total", { mode: "logs" });
    metrics.increment("analysis_requests_total", { mode: "alert" });

    expect(metrics.snapshot()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "analysis_requests_total", value: 2, labels: { mode: "logs" } }),
        expect.objectContaining({ name: "analysis_requests_total", value: 1, labels: { mode: "alert" } })
      ])
    );
  });

  it("sanitizes secrets from error events", async () => {
    const fixture = JSON.parse(await readFile("data/fixtures/observability/sanitized-error.json", "utf8")) as {
      raw: string;
      mustContain: string[];
      mustNotContain: string[];
    };
    const reporter = new ErrorReporter();
    const event = reporter.report({
      error: new Error(fixture.raw),
      component: "provider",
      requestId: "request_test"
    });

    for (const value of fixture.mustContain) {
      expect(event.sanitizedError).toContain(value);
    }
    for (const value of fixture.mustNotContain) {
      expect(event.sanitizedError).not.toContain(value);
    }
  });

  it("reports degraded dependencies and applies retry policy limits", async () => {
    const provider: CyberModelProvider = {
      name: "test-provider",
      async analyze() {
        return { text: "ok" };
      }
    };
    const storage = {
      kind: "broken-storage",
      cases: {
        async list() {
          throw new Error("storage unavailable");
        }
      }
    } as unknown as StorageAdapter;
    const health = new HealthService(provider, storage);
    const dependencies = await health.checkDependencies();
    const storageHealth = dependencies.find((dependency) => dependency.dependency === "storage:broken-storage");

    expect(storageHealth).toMatchObject({
      status: "degraded",
      errorSummary: "storage unavailable"
    });
    expect(shouldRetry({ attempts: 2, policy: { maxAttempts: 3, backoffMs: 100, idempotencyKey: "job", deadLetter: true } })).toBe(true);
    expect(shouldRetry({ attempts: 3, policy: { maxAttempts: 3, backoffMs: 100, idempotencyKey: "job", deadLetter: true } })).toBe(false);
    expect(nextBackoffMs({ attempts: 3, policy: { maxAttempts: 3, backoffMs: 100, idempotencyKey: "job", deadLetter: true } })).toBe(300);
  });
});
