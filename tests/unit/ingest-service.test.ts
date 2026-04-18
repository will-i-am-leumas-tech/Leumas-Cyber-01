import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { buildArtifactsFromInput } from "../../apps/api/src/ingest/artifact-service";
import { buildIngestionBundle } from "../../apps/api/src/ingest/event-normalizer";
import { selectParser } from "../../apps/api/src/ingest/parser-registry";

describe("ingest service", () => {
  it("selects parsers by file type and content", async () => {
    const csvText = await readFile("data/fixtures/ingest/mixed-case-bundle/auth.csv", "utf8");
    const jsonText = await readFile("data/fixtures/ingest/mixed-case-bundle/process.json", "utf8");
    const logText = await readFile("data/fixtures/logs/auth-bruteforce.log", "utf8");

    const [csvArtifact] = buildArtifactsFromInput({ mode: "logs", files: [{ filename: "auth.csv", text: csvText }] });
    const [jsonArtifact] = buildArtifactsFromInput({
      mode: "alert",
      files: [{ filename: "process.json", text: jsonText, json: JSON.parse(jsonText) }]
    });
    const [logArtifact] = buildArtifactsFromInput({ mode: "logs", files: [{ filename: "auth.log", text: logText }] });

    expect(selectParser(csvArtifact).id).toBe("csv");
    expect(selectParser(jsonArtifact).id).toBe("json-alert");
    expect(selectParser(logArtifact).id).toBe("line-log");
  });

  it("preserves JSON pointer source refs for JSON alerts", async () => {
    const jsonText = await readFile("data/fixtures/ingest/mixed-case-bundle/process.json", "utf8");
    const ingestion = buildIngestionBundle({
      mode: "alert",
      files: [{ filename: "process.json", text: jsonText, json: JSON.parse(jsonText) }]
    });

    expect(ingestion.normalizedEvents).toHaveLength(1);
    expect(ingestion.normalizedEvents[0].rawRef.jsonPointer).toBe("/");
    expect(ingestion.normalizedEvents[0].eventType).toBe("process_creation");
    expect(ingestion.entities.map((entity) => entity.type)).toEqual(expect.arrayContaining(["host", "user", "ip", "process"]));
  });

  it("preserves line-number source refs for log files and merges duplicate entities", async () => {
    const logText = await readFile("data/fixtures/logs/auth-bruteforce.log", "utf8");
    const ingestion = buildIngestionBundle({
      mode: "logs",
      files: [{ filename: "auth-bruteforce.log", text: logText }]
    });

    expect(ingestion.normalizedEvents).toHaveLength(5);
    expect(ingestion.normalizedEvents[0].rawRef.lineNumber).toBe(1);
    expect(ingestion.entities.filter((entity) => entity.normalized === "admin")).toHaveLength(1);
    expect(ingestion.entities.filter((entity) => entity.normalized === "203.0.113.10")).toHaveLength(1);
  });
});
