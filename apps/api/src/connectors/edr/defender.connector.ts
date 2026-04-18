import { createFixtureConnector } from "../fixture-connector";

export const defenderFixtureConnector = createFixtureConnector({
  fixturePath: "data/fixtures/connectors/defender-device-events.json",
  idField: "eventId",
  definition: {
    id: "defender-fixture",
    type: "edr",
    vendor: "Microsoft",
    name: "Microsoft Defender Fixture",
    enabled: true,
    operations: [
      {
        id: "search_device_events",
        description: "Search Defender-style endpoint device event records from local fixtures.",
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
