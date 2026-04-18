import { createFixtureConnector } from "../fixture-connector";

export const entraFixtureConnector = createFixtureConnector({
  fixturePath: "data/fixtures/connectors/entra-signins.json",
  idField: "signInId",
  definition: {
    id: "entra-fixture",
    type: "identity",
    vendor: "Microsoft",
    name: "Microsoft Entra ID Fixture",
    enabled: true,
    operations: [
      {
        id: "search_signins",
        description: "Search Entra-style sign-in records from local fixtures.",
        readOnly: true
      }
    ],
    credentialRef: {
      type: "none",
      ref: "fixture"
    },
    dataClasses: ["confidential"]
  }
});
