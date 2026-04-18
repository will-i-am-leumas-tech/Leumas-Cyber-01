import type { CyberModelProvider } from "../providers/base-provider";
import type { HealthCheckResult } from "../schemas/observability.schema";
import type { StorageAdapter } from "../storage/storage-adapter";
import { getConnector, listConnectors } from "../tools/connector-registry";

async function measure(dependency: string, check: () => Promise<void>): Promise<HealthCheckResult> {
  const started = Date.now();
  try {
    await check();
    return {
      dependency,
      status: "healthy",
      latencyMs: Date.now() - started
    };
  } catch (error) {
    return {
      dependency,
      status: "degraded",
      latencyMs: Date.now() - started,
      errorSummary: error instanceof Error ? error.message : "Dependency check failed."
    };
  }
}

export class HealthService {
  constructor(
    private readonly provider: CyberModelProvider,
    private readonly storage: StorageAdapter
  ) {}

  async checkDependencies(): Promise<HealthCheckResult[]> {
    const connectorChecks = listConnectors().map((metadata) =>
      measure(`connector:${metadata.id}`, async () => {
        const connector = getConnector(metadata.id);
        if (!connector) {
          throw new Error("Connector implementation missing.");
        }
        const result = await connector.healthCheck();
        if (!result.ok) {
          throw new Error(result.message);
        }
      })
    );

    return Promise.all([
      measure(`provider:${this.provider.name}`, async () => undefined),
      measure(`storage:${this.storage.kind}`, async () => {
        await this.storage.cases.list();
      }),
      ...connectorChecks
    ]);
  }
}
