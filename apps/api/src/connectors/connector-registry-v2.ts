import type { SecurityConnector } from "./connector-v2";
import { awsSecurityFixtureConnector } from "./cloud/aws-security.connector";
import { defenderFixtureConnector } from "./edr/defender.connector";
import { entraFixtureConnector } from "./identity/entra.connector";
import { sentinelFixtureConnector } from "./siem/sentinel.connector";
import type { ConnectorDefinition } from "../schemas/connectors.schema";

const connectors: SecurityConnector[] = [
  sentinelFixtureConnector,
  defenderFixtureConnector,
  entraFixtureConnector,
  awsSecurityFixtureConnector
];

export function listSecurityConnectors(): ConnectorDefinition[] {
  return connectors.map((connector) => connector.definition);
}

export function getSecurityConnector(connectorId: string): SecurityConnector | undefined {
  return connectors.find((connector) => connector.definition.id === connectorId);
}

export function listSecurityConnectorInstances(): SecurityConnector[] {
  return connectors;
}
