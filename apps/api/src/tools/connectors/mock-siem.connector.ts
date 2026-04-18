import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Connector } from "../../schemas/tools.schema";
import { findProjectRoot } from "../../utils/files";

export interface ConnectorExecutionResult {
  summary: string;
  recordRefs: string[];
  records: Array<Record<string, unknown>>;
  sensitiveFields: string[];
}

export interface ToolConnector {
  metadata: Connector;
  healthCheck(): Promise<{ ok: boolean; message: string }>;
  execute(operation: string, parameters: Record<string, unknown>): Promise<ConnectorExecutionResult>;
}

async function loadEvents(): Promise<Array<Record<string, unknown>>> {
  const filePath = path.join(findProjectRoot(), "data", "fixtures", "tools", "mock-siem-events.json");
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as Array<Record<string, unknown>>;
}

function searchRecords(records: Array<Record<string, unknown>>, parameters: Record<string, unknown>): Array<Record<string, unknown>> {
  const query = typeof parameters.query === "string" ? parameters.query.toLowerCase() : "";
  const limit = typeof parameters.limit === "number" ? Math.max(1, Math.min(parameters.limit, 20)) : 5;
  const terms = query.match(/[a-z0-9_.:-]{3,}/g) ?? [];

  if (terms.length === 0) {
    return records.slice(0, limit);
  }

  return records
    .filter((record) => {
      const serialized = JSON.stringify(record).toLowerCase();
      return terms.some((term) => serialized.includes(term));
    })
    .slice(0, limit);
}

export const mockSiemConnector: ToolConnector = {
  metadata: {
    id: "mock-siem",
    type: "siem",
    name: "Mock SIEM",
    enabled: true,
    capabilities: ["search_events"],
    credentialRef: {
      type: "none",
      ref: "mock"
    }
  },

  async healthCheck() {
    const events = await loadEvents();
    return {
      ok: events.length > 0,
      message: `Mock SIEM loaded ${events.length} fixture events.`
    };
  },

  async execute(operation: string, parameters: Record<string, unknown>): Promise<ConnectorExecutionResult> {
    if (operation !== "search_events") {
      throw new Error(`Unsupported mock SIEM operation: ${operation}`);
    }

    const matches = searchRecords(await loadEvents(), parameters);
    return {
      summary: `Mock SIEM returned ${matches.length} event${matches.length === 1 ? "" : "s"}.`,
      recordRefs: matches.map((record) => String(record.id ?? record.eventId ?? record.timestamp ?? "mock-record")),
      records: matches,
      sensitiveFields: []
    };
  }
};
