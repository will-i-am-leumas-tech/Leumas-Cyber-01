import type { SecurityConnector } from "./connector-v2";
import { checkConnectorAuth } from "./connector-auth";
import { filterFixtureRecords, readFixtureRecords } from "./transports/mock-http-transport";
import type { ConnectorDefinition, ConnectorHealth, ConnectorQueryRequest, ConnectorQueryResult } from "../schemas/connectors.schema";
import { nowIso } from "../utils/time";

export function createFixtureConnector(input: {
  definition: ConnectorDefinition;
  fixturePath: string;
  idField?: string;
}): SecurityConnector {
  return {
    definition: input.definition,

    async healthCheck(): Promise<ConnectorHealth> {
      const auth = checkConnectorAuth(input.definition);
      if (!input.definition.enabled) {
        return {
          connectorId: input.definition.id,
          ok: false,
          status: "disabled",
          message: "Connector is disabled.",
          checkedAt: nowIso()
        };
      }

      if (!auth.configured) {
        return {
          connectorId: input.definition.id,
          ok: false,
          status: "degraded",
          message: auth.reason,
          checkedAt: nowIso()
        };
      }

      const records = await readFixtureRecords(input.fixturePath);
      return {
        connectorId: input.definition.id,
        ok: records.length > 0,
        status: records.length > 0 ? "healthy" : "degraded",
        message: `${input.definition.name} loaded ${records.length} fixture record${records.length === 1 ? "" : "s"}.`,
        checkedAt: nowIso()
      };
    },

    async query(request: ConnectorQueryRequest): Promise<ConnectorQueryResult> {
      const records = await readFixtureRecords(input.fixturePath);
      const matches = filterFixtureRecords({
        records,
        query: request.query,
        filters: request.filters,
        limit: request.limit
      });
      const idField = input.idField ?? "id";
      const retrievedAt = nowIso();

      return {
        connectorId: input.definition.id,
        operation: request.operation,
        summary: `${input.definition.name} returned ${matches.length} record${matches.length === 1 ? "" : "s"}.`,
        recordRefs: matches.map((record) => String(record[idField] ?? record.id ?? record.eventId ?? record.timestamp ?? "fixture-record")),
        records: matches,
        sensitiveFields: [],
        retrievedAt
      };
    }
  };
}
