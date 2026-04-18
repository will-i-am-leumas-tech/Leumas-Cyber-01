import { listSecurityConnectorInstances } from "./connector-registry-v2";
import type { ConnectorHealth } from "../schemas/connectors.schema";

export async function checkSecurityConnectorHealth(): Promise<ConnectorHealth[]> {
  return Promise.all(listSecurityConnectorInstances().map((connector) => connector.healthCheck()));
}
