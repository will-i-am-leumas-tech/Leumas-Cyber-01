import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { ensureDir } from "../../utils/files";
import type { ArtifactRepository } from "../storage-adapter";

function safeRef(ref: string): string {
  return ref.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

export class LocalJsonArtifactRepository implements ArtifactRepository {
  constructor(private readonly dataDir: string) {}

  private artifactPath(ref: string): string {
    return path.join(this.dataDir, "artifacts", safeRef(ref));
  }

  async put(ref: string, content: string): Promise<{ ref: string; sizeBytes: number }> {
    const filePath = this.artifactPath(ref);
    await ensureDir(path.dirname(filePath));
    await writeFile(filePath, content, "utf8");
    return {
      ref,
      sizeBytes: Buffer.byteLength(content, "utf8")
    };
  }

  async get(ref: string): Promise<string | null> {
    try {
      return await readFile(this.artifactPath(ref), "utf8");
    } catch {
      return null;
    }
  }
}
