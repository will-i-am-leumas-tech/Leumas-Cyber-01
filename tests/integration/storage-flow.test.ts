import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../apps/api/src/app";

let app: FastifyInstance | undefined;

async function createTestApp(): Promise<FastifyInstance> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "leumas-storage-flow-"));
  app = await createApp({ dataDir });
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("storage and search flow", () => {
  it("persists analyzed cases, returns search results, and exposes job status", async () => {
    const fastify = await createTestApp();

    const analyze = await fastify.inject({
      method: "POST",
      url: "/analyze",
      payload: {
        mode: "logs",
        title: "Storage Search Case",
        text: "2026-04-16T10:15:00Z host=WS-42 parent=WINWORD.EXE image=powershell.exe command_line=\"powershell.exe -EncodedCommand SQBFAFgA\"",
        useKnowledge: false
      }
    });
    expect(analyze.statusCode).toBe(200);

    const search = await fastify.inject({
      method: "GET",
      url: "/search?q=encoded%20powershell"
    });
    expect(search.statusCode).toBe(200);
    expect(search.json().cases.map((item: { id: string }) => item.id)).toContain(analyze.json().caseId);

    const jobResponse = await fastify.inject({
      method: "POST",
      url: "/jobs",
      payload: {
        type: "storage.index.refresh",
        payload: {
          caseId: analyze.json().caseId
        }
      }
    });
    expect(jobResponse.statusCode).toBe(200);

    const jobDetail = await fastify.inject({
      method: "GET",
      url: `/jobs/${jobResponse.json().job.id}`
    });
    expect(jobDetail.statusCode).toBe(200);
    expect(jobDetail.json().job.status).toBe("queued");
  }, 20000);
});
