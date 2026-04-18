import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-endpoint-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("endpoint and forensics flow", () => {
  it("analyzes Windows process logs and returns process tree, timeline, and artifacts", async () => {
    const fastify = await createTestApp();
    const processLog = await readFile("data/fixtures/logs/windows-process.log", "utf8");

    const analyzeResponse = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "logs",
        text: processLog
      }
    });
    expect(analyzeResponse.statusCode).toBe(200);
    expect(analyzeResponse.json().result.title).toBe("Suspicious PowerShell Execution");
    const caseId = analyzeResponse.json().caseId;

    const endpointResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/endpoint-events`,
      payload: {
        text: processLog
      }
    });
    expect(endpointResponse.statusCode).toBe(200);
    expect(endpointResponse.json().endpointEvents).toHaveLength(3);
    expect(JSON.stringify(endpointResponse.json().processTrees)).toContain("encoded_powershell");
    expect(endpointResponse.json().forensicArtifacts.map((item: { type: string }) => item.type)).toEqual(
      expect.arrayContaining(["process_logs", "script_block_logs", "prefetch"])
    );

    const treeResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}/process-tree`
    });
    expect(treeResponse.statusCode).toBe(200);
    expect(treeResponse.json().processTrees[0].roots[0].children.length).toBeGreaterThan(0);

    const timelineResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}/forensic-timeline`
    });
    expect(timelineResponse.statusCode).toBe(200);
    expect(timelineResponse.json().forensicTimeline).toHaveLength(3);

    const artifactsResponse = await fastify.inject({
      method: "POST",
      url: `/cases/${caseId}/forensic-artifacts`,
      payload: {
        artifacts: [
          {
            type: "edr_alert",
            source: "EDR console export for WS-42",
            collected: true,
            hash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            storageRef: "case-evidence/ws-42/edr-alert.json",
            chainOfCustody: ["Collected by analyst@example.test"]
          }
        ]
      }
    });
    expect(artifactsResponse.statusCode).toBe(200);
    expect(artifactsResponse.json().forensicArtifacts[0].collected).toBe(true);

    const caseResponse = await fastify.inject({
      method: "GET",
      url: `/cases/${caseId}`
    });
    expect(caseResponse.json().auditEntries.map((entry: { action: string }) => entry.action)).toEqual(
      expect.arrayContaining(["endpoint.events_imported", "forensic.artifacts_recorded"])
    );
    expect(caseResponse.json().result.timeline.map((event: { label: string }) => event.label).join(" ")).toContain(
      "powershell.exe"
    );
  });
});
