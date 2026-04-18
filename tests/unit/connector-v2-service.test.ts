import { describe, expect, it } from "vitest";
import { listSecurityConnectors } from "../../apps/api/src/connectors/connector-registry-v2";
import { evaluateConnectorPolicy } from "../../apps/api/src/connectors/connector-policy";
import { checkSecurityConnectorHealth } from "../../apps/api/src/connectors/connector-health-service";

describe("connector v2 services", () => {
  it("registers read-only security connectors across core source types", () => {
    const connectors = listSecurityConnectors();

    expect(connectors.map((connector) => connector.type)).toEqual(expect.arrayContaining(["siem", "edr", "identity", "cloud"]));
    expect(connectors.every((connector) => connector.operations.every((operation) => operation.readOnly))).toBe(true);
    expect(connectors.find((connector) => connector.id === "sentinel-fixture")).toMatchObject({
      vendor: "Microsoft",
      enabled: true
    });
  });

  it("allows read-only operations and denies write-like or unknown operations", () => {
    const connector = listSecurityConnectors().find((candidate) => candidate.id === "sentinel-fixture");

    expect(
      evaluateConnectorPolicy({
        definition: connector,
        request: {
          operation: "search_alerts",
          actor: "analyst@example.test",
          filters: {},
          limit: 10
        }
      })
    ).toMatchObject({
      allowed: true
    });

    expect(
      evaluateConnectorPolicy({
        definition: connector,
        request: {
          operation: "delete_alerts",
          actor: "analyst@example.test",
          filters: {},
          limit: 10
        }
      })
    ).toMatchObject({
      allowed: false,
      reason: "operation_not_allowed"
    });
  });

  it("reports fixture connector health without live credentials", async () => {
    const health = await checkSecurityConnectorHealth();

    expect(health).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          connectorId: "defender-fixture",
          ok: true,
          status: "healthy"
        })
      ])
    );
  });
});
