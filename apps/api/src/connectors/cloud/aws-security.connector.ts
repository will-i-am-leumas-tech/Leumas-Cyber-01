import { createFixtureConnector } from "../fixture-connector";

export const awsSecurityFixtureConnector = createFixtureConnector({
  fixturePath: "data/fixtures/connectors/aws-security-findings.json",
  idField: "findingId",
  definition: {
    id: "aws-security-fixture",
    type: "cloud",
    vendor: "AWS",
    name: "AWS Security Fixture",
    enabled: true,
    operations: [
      {
        id: "search_findings",
        description: "Search AWS-style security finding records from local fixtures.",
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
