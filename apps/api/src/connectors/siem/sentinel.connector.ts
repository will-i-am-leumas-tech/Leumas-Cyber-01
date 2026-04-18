import { createFixtureConnector } from "../fixture-connector";

export const sentinelFixtureConnector = createFixtureConnector({
  fixturePath: "data/fixtures/connectors/sentinel-alerts.json",
  idField: "alertId",
  definition: {
    id: "sentinel-fixture",
    type: "siem",
    vendor: "Microsoft",
    name: "Microsoft Sentinel Fixture",
    enabled: true,
    operations: [
      {
        id: "search_alerts",
        description: "Search Sentinel-style alert records from local fixtures.",
        readOnly: true
      }
    ],
    credentialRef: {
      type: "none",
      ref: "fixture"
    },
    dataClasses: ["internal"]
  }
});
