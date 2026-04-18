import type {
  ConnectorDefinition,
  ConnectorHealth,
  ConnectorQueryRequest,
  ConnectorQueryResult
} from "../schemas/connectors.schema";

export interface SecurityConnector {
  definition: ConnectorDefinition;
  healthCheck(): Promise<ConnectorHealth>;
  query(request: ConnectorQueryRequest): Promise<ConnectorQueryResult>;
}
