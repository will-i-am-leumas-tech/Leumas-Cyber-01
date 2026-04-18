import { existsSync, statSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const roots = ["apps/api/src", "apps/web/src", "docs", "scripts", "tests", ".github", "package.json", "goal.md", "README.md"];
const checkedExtensions = new Set([".css", ".json", ".md", ".ts", ".tsx", ".yaml", ".yml"]);
const ignoreDirs = new Set(["node_modules", "dist", "tmp"]);

async function walk(target: string): Promise<string[]> {
  if (!existsSync(target)) {
    return [];
  }

  const stat = statSync(target);
  if (stat.isFile()) {
    return checkedExtensions.has(path.extname(target)) ? [target] : [];
  }
  if (!stat.isDirectory() || ignoreDirs.has(path.basename(target))) {
    return [];
  }

  const entries = await readdir(target, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => walk(path.join(target, entry.name))));
  return nested.flat();
}

export async function lintTextFiles(): Promise<string[]> {
  const files = (await Promise.all(roots.map((root) => walk(root)))).flat();
  const failures: string[] = [];

  for (const file of files) {
    const text = await readFile(file, "utf8");
    const lines = text.split(/\r?\n/);
    const extension = path.extname(file);
    lines.forEach((line, index) => {
      if (/[ \t]+$/.test(line)) {
        failures.push(`${file}:${index + 1} trailing whitespace`);
      }
      if (line.length > 220 && extension !== ".json" && extension !== ".md") {
        failures.push(`${file}:${index + 1} line exceeds 220 characters`);
      }
    });
    if (!text.endsWith("\n")) {
      failures.push(`${file}: missing final newline`);
    }
  }

  return failures;
}

async function main(): Promise<void> {
  const failures = await lintTextFiles();
  if (failures.length > 0) {
    console.error(`Lint failed with ${failures.length} issue${failures.length === 1 ? "" : "s"}.`);
    failures.forEach((failure) => console.error(failure));
    process.exit(1);
  }
  console.log("Lint passed.");
}

if (process.argv[1] && path.basename(process.argv[1]) === "lint.ts") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
