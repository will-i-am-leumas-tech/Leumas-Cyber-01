import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

export function findProjectRoot(startDir = process.cwd()): string {
  let current = path.resolve(startDir);

  while (true) {
    if (existsSync(path.join(current, "goal.md"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }
    current = parent;
  }
}

export function resolveDataDir(dataDir?: string): string {
  const configured = dataDir ?? process.env.DATA_DIR ?? "data";
  if (path.isAbsolute(configured)) {
    return configured;
  }
  return path.resolve(findProjectRoot(), configured);
}

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function ensureDataDirs(dataDir: string): Promise<void> {
  await Promise.all([
    ensureDir(path.join(dataDir, "cases")),
    ensureDir(path.join(dataDir, "audits")),
    ensureDir(path.join(dataDir, "fixtures")),
    ensureDir(path.join(dataDir, "cloud-security")),
    ensureDir(path.join(dataDir, "threat-intel")),
    ensureDir(path.join(dataDir, "sandbox")),
    ensureDir(path.join(dataDir, "validation")),
    ensureDir(path.join(dataDir, "vulnerabilities")),
    ensureDir(path.join(dataDir, "knowledge", "sources")),
    ensureDir(path.join(dataDir, "knowledge", "chunks")),
    ensureDir(path.join(dataDir, "knowledge", "snapshots")),
    ensureDir(path.join(dataDir, "knowledge", "approvals")),
    ensureDir(path.join(dataDir, "collaboration", "notes"))
  ]);
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function appendJsonLine(filePath: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await appendFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

export async function listJsonFiles(dir: string): Promise<string[]> {
  if (!existsSync(dir)) {
    return [];
  }

  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(dir, entry.name));
}
