import { existsSync, statSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface SecretFinding {
  path: string;
  line: number;
  column: number;
  type: string;
  match: string;
}

interface AllowlistEntry {
  path: string;
  line?: number;
  type?: string;
  reason: string;
}

const defaultRoots = ["apps", "data/fixtures", "docs", "scripts", "tests", ".github", "package.json", "goal.md", "README.md"];
const ignoredSegments = new Set(["node_modules", ".git", "dist", "tmp", "data/cases", "data/audits"]);
const allowMarker = "secret-scan: allow";
const allowlistPath = "docs/security/secret-scan-allowlist.json";
const maxFileBytes = 1024 * 1024;
const scannedExtensions = new Set([
  ".cjs",
  ".css",
  ".js",
  ".json",
  ".jsonl",
  ".log",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml"
]);

const secretPatterns: Array<{ type: string; pattern: RegExp }> = [
  { type: "aws_access_key", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { type: "github_token", pattern: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/g },
  { type: "openai_key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/g },
  { type: "private_key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  {
    type: "assigned_secret",
    pattern: /\b(?:api[_-]?key|client[_-]?secret|secret[_-]?key|access[_-]?token|refresh[_-]?token|token|password|passwd|pwd|secret)\s*[:=]\s*["']?[A-Za-z0-9_./+=!@#$%^&*()-]{12,}/gi
  }
];

function relativePath(filePath: string, cwd = process.cwd()): string {
  return path.relative(cwd, path.resolve(cwd, filePath)).replace(/\\/g, "/");
}

function shouldIgnore(relPath: string): boolean {
  return [...ignoredSegments].some((segment) => relPath === segment || relPath.startsWith(`${segment}/`) || relPath.includes(`/${segment}/`));
}

async function walk(root: string, cwd = process.cwd(), isExplicitRoot = true): Promise<string[]> {
  const abs = path.resolve(cwd, root);
  if (!existsSync(abs)) {
    return [];
  }

  const rel = relativePath(abs, cwd);
  if (!isExplicitRoot && shouldIgnore(rel)) {
    return [];
  }

  const stat = statSync(abs);
  if (stat.isFile()) {
    return scannedExtensions.has(path.extname(abs)) && stat.size <= maxFileBytes ? [abs] : [];
  }
  if (!stat.isDirectory()) {
    return [];
  }

  const entries = await readdir(abs, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => walk(path.join(rel, entry.name), cwd, false)));
  return nested.flat();
}

async function loadAllowlist(cwd = process.cwd()): Promise<AllowlistEntry[]> {
  const abs = path.resolve(cwd, allowlistPath);
  if (!existsSync(abs)) {
    return [];
  }
  const parsed = JSON.parse(await readFile(abs, "utf8")) as { allowedFindings?: AllowlistEntry[] };
  return parsed.allowedFindings ?? [];
}

function isAllowed(finding: SecretFinding, lineText: string, allowlist: AllowlistEntry[]): boolean {
  if (lineText.includes(allowMarker)) {
    return true;
  }

  return allowlist.some(
    (entry) =>
      entry.path === finding.path &&
      (entry.line === undefined || entry.line === finding.line) &&
      (entry.type === undefined || entry.type === finding.type)
  );
}

function isBenignAssignedSecretMatch(matchText: string): boolean {
  return /=\s*process\.env\./i.test(matchText) || /:\s*process\.env\./i.test(matchText);
}

function lineColumnForIndex(text: string, index: number): { line: number; column: number; lineText: string } {
  const prefix = text.slice(0, index);
  const lines = prefix.split(/\r?\n/);
  const allLines = text.split(/\r?\n/);
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;
  return {
    line,
    column,
    lineText: allLines[line - 1] ?? ""
  };
}

export async function scanSecrets(roots = defaultRoots, cwd = process.cwd()): Promise<SecretFinding[]> {
  const files = (await Promise.all(roots.map((root) => walk(root, cwd)))).flat();
  const allowlist = await loadAllowlist(cwd);
  const findings: SecretFinding[] = [];

  for (const file of files) {
    const text = await readFile(file, "utf8");
    const rel = relativePath(file, cwd);
    for (const { type, pattern } of secretPatterns) {
      pattern.lastIndex = 0;
      for (const match of text.matchAll(pattern)) {
        if (match.index === undefined) {
          continue;
        }
        if (type === "assigned_secret" && isBenignAssignedSecretMatch(match[0])) {
          continue;
        }
        const location = lineColumnForIndex(text, match.index);
        const finding: SecretFinding = {
          path: rel,
          line: location.line,
          column: location.column,
          type,
          match: match[0].slice(0, 24)
        };
        if (!isAllowed(finding, location.lineText, allowlist)) {
          findings.push(finding);
        }
      }
    }
  }

  return findings.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line || a.column - b.column);
}

export async function writeSecretScanReport(findings: SecretFinding[], outputPath = "tmp/secret-scan-report.json"): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify({ findings }, null, 2)}\n`, "utf8");
}

async function main(): Promise<void> {
  const roots = process.argv.slice(2);
  const findings = await scanSecrets(roots.length > 0 ? roots : defaultRoots);
  await writeSecretScanReport(findings);
  if (findings.length > 0) {
    console.error(`Secret scan failed with ${findings.length} finding${findings.length === 1 ? "" : "s"}.`);
    for (const finding of findings) {
      console.error(`${finding.path}:${finding.line}:${finding.column} ${finding.type}`);
    }
    process.exit(1);
  }
  console.log("Secret scan passed with 0 unapproved findings.");
}

if (process.argv[1] && path.basename(process.argv[1]) === "security-scan.ts") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
