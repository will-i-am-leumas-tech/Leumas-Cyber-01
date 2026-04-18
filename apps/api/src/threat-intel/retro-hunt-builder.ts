import type { RetroHuntRequest, RetroHuntRequestInput, StixObjectRecord } from "../schemas/threat-intel-v2.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

function lookupIndicator(indicatorId: string, objects: StixObjectRecord[]): StixObjectRecord | undefined {
  return objects.find((object) => object.id === indicatorId || object.stixId === indicatorId);
}

function defensiveQuery(dataSource: string, record: StixObjectRecord | undefined, indicatorId: string): string {
  const value = record?.indicatorValue ?? indicatorId;
  if (dataSource.includes("dns")) {
    return `where dns_query == "${value}" | project timestamp, host, dns_query, source`;
  }
  if (dataSource.includes("proxy") || dataSource.includes("web")) {
    return `where url_or_domain == "${value}" | project timestamp, user, asset, url_or_domain`;
  }
  if (dataSource.includes("endpoint")) {
    return `where process_or_network_indicator == "${value}" | project timestamp, device, process_name`;
  }
  return `where indicator == "${value}" | project timestamp, asset, indicator, source`;
}

export function buildRetroHuntRequest(input: RetroHuntRequestInput, objects: StixObjectRecord[]): RetroHuntRequest {
  const results = input.indicatorIds.flatMap((indicatorId) =>
    input.dataSources.map((dataSource) => {
      const record = lookupIndicator(indicatorId, objects);
      return {
        id: createId("retro_hunt_query"),
        indicatorId,
        dataSource,
        query: defensiveQuery(dataSource, record, indicatorId),
        expectedEvidence: ["timestamp", "asset", "source", record?.indicatorType ?? "indicator"],
        readOnly: true as const
      };
    })
  );

  return {
    id: createId("retro_hunt"),
    caseId: input.caseId,
    indicatorIds: input.indicatorIds,
    dataSources: input.dataSources,
    timeRange: input.timeRange,
    status: "planned",
    results,
    createdAt: nowIso()
  };
}
