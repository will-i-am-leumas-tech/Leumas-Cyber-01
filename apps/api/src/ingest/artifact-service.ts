import type { AnalyzeInput } from "../schemas/input.schema";
import type { UploadedArtifact, UploadedInputFile } from "../schemas/ingest.schema";
import { sha256Text } from "../reasoning/hash";
import { nowIso } from "../utils/time";

function mediaTypeForFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".json")) {
    return "application/json";
  }
  if (lower.endsWith(".csv")) {
    return "text/csv";
  }
  if (lower.endsWith(".log")) {
    return "text/x-log";
  }
  return "text/plain";
}

export interface ArtifactWithContent {
  artifact: UploadedArtifact;
  text: string;
  json?: unknown;
}

function artifactFromFile(file: UploadedInputFile, index: number): ArtifactWithContent {
  const hash = sha256Text(file.text);
  return {
    artifact: {
      id: `artifact_${hash.slice(0, 16)}`,
      filename: file.filename,
      mediaType: file.mediaType ?? mediaTypeForFilename(file.filename),
      hash,
      sizeBytes: Buffer.byteLength(file.text, "utf8"),
      storageRef: `upload:${file.filename}`,
      source: "upload",
      createdAt: nowIso()
    },
    text: file.text,
    json: file.json
  };
}

export function buildArtifactsFromInput(input: AnalyzeInput): ArtifactWithContent[] {
  const artifacts: ArtifactWithContent[] = [];

  if (input.files && input.files.length > 0) {
    return input.files.map(artifactFromFile);
  }

  if (input.text !== undefined) {
    const filename = input.filename ?? "inline-text.txt";
    const text = input.text;
    const hash = sha256Text(text);
    artifacts.push({
      artifact: {
        id: `artifact_${hash.slice(0, 16)}`,
        filename,
        mediaType: mediaTypeForFilename(filename),
        hash,
        sizeBytes: Buffer.byteLength(text, "utf8"),
        storageRef: "inline:text",
        source: input.filename ? "upload" : "inline",
        createdAt: nowIso()
      },
      text
    });
  }

  if (input.json !== undefined) {
    const text = JSON.stringify(input.json, null, 2);
    const hash = sha256Text(text);
    artifacts.push({
      artifact: {
        id: `artifact_${hash.slice(0, 16)}`,
        filename: input.filename ?? "inline-json.json",
        mediaType: "application/json",
        hash,
        sizeBytes: Buffer.byteLength(text, "utf8"),
        storageRef: "inline:json",
        source: input.filename ? "upload" : "inline",
        createdAt: nowIso()
      },
      text,
      json: input.json
    });
  }

  return artifacts;
}
