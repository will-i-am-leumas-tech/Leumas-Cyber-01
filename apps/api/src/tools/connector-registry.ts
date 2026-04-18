import type { Connector } from "../schemas/tools.schema";
import { mockSiemConnector, type ToolConnector } from "./connectors/mock-siem.connector";

const connectors: ToolConnector[] = [mockSiemConnector];

export function listConnectors(): Connector[] {
  return connectors.map((connector) => connector.metadata);
}

export function getConnector(connectorId: string): ToolConnector | undefined {
  return connectors.find((connector) => connector.metadata.id === connectorId);
}
