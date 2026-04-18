import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { InMemoryJobQueue } from "../../apps/api/src/jobs/job-queue";
import { searchCases } from "../../apps/api/src/search/search-index";
import { cyberCaseSchema } from "../../apps/api/src/schemas/case.schema";
import { CaseService } from "../../apps/api/src/services/case-service";
import { createLocalJsonStorageAdapter } from "../../apps/api/src/storage/local/local-storage-adapter";
import { migrateCasesToRepository } from "../../apps/api/src/storage/migrations/json-to-repository";

async function tempDir(prefix: string): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

describe("storage scaffold", () => {
  it("saves, loads, and searches cases through the local repository contract", async () => {
    const dataDir = await tempDir("leumas-storage-repo-");
    const adapter = createLocalJsonStorageAdapter(dataDir);
    const fixture = cyberCaseSchema.parse(JSON.parse(await readFile("data/fixtures/storage/sample-case.json", "utf8")));

    await adapter.cases.save(fixture);
    const loaded = await adapter.cases.get(fixture.id);
    const searchResults = await adapter.cases.search("encoded powershell");

    expect(loaded?.id).toBe("case_storage_fixture");
    expect(searchResults.map((item) => item.id)).toContain("case_storage_fixture");
  });

  it("migrates local JSON cases into a repository adapter", async () => {
    const sourceDir = await tempDir("leumas-storage-source-");
    const targetDir = await tempDir("leumas-storage-target-");
    const source = new CaseService(sourceDir);
    const target = createLocalJsonStorageAdapter(targetDir);
    const fixture = cyberCaseSchema.parse(JSON.parse(await readFile("data/fixtures/storage/sample-case.json", "utf8")));
    await source.saveCase(fixture);

    const result = await migrateCasesToRepository({
      source,
      target: target.cases
    });

    expect(result).toMatchObject({
      migratedCases: 1,
      skippedCases: 0,
      errors: []
    });
    expect(await target.cases.get("case_storage_fixture")).not.toBeNull();
  });

  it("indexes full case content and retries jobs deterministically", async () => {
    const fixture = cyberCaseSchema.parse(JSON.parse(await readFile("data/fixtures/storage/sample-case.json", "utf8")));
    const searchResults = searchCases([fixture], "powershell evidence");
    const queue = new InMemoryJobQueue();
    const job = queue.enqueue({
      type: "storage.migration",
      payload: {
        source: "json",
        target: "repository"
      },
      maxAttempts: 2
    });
    const firstClaim = queue.claim("storage.migration");
    const retry = queue.fail(job.id, "transient write failure");
    const secondClaim = queue.claim("storage.migration");
    const failed = queue.fail(job.id, "permanent write failure");

    expect(searchResults).toHaveLength(1);
    expect(firstClaim?.status).toBe("running");
    expect(retry?.status).toBe("queued");
    expect(secondClaim?.attempts).toBe(2);
    expect(failed?.status).toBe("failed");
  });
});
