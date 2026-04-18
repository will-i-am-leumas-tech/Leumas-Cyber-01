import { existsSync, statSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export interface DocCheckFailure {
  file: string;
  message: string;
}

export interface DocCheckResult {
  checkedFiles: string[];
  failures: DocCheckFailure[];
}

const docsRoot = "docs";
const requiredDocs = [
  "docs/README.md",
  "docs/getting-started/local-dev.md",
  "docs/analyst-guide/triage-workflow.md",
  "docs/admin-guide/configuration.md",
  "docs/api/openapi.yaml",
  "docs/connectors/local-connectors.md",
  "docs/security/safety-policy.md",
  "docs/runbooks/provider-down.md",
  "docs/examples/powershell-alert-walkthrough.md"
];
const requiredLocalDevCommands = ["npm install", "npm test", "npm run build", "npm run dev:api", "npm run dev:web"];
const requiredOpenApiPaths = ["/health", "/analyze", "/cases/{id}", "/safety/evaluate", "/docs/openapi.json"];
const requiredSafetySections = ["Allowed example", "Blocked example", "Ambiguous example", "safe redirect"];
const markdownLinkPattern = /!?\[[^\]]+\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)/g;

async function walkMarkdownFiles(root: string): Promise<string[]> {
  if (!existsSync(root)) {
    return [];
  }

  const stat = statSync(root);
  if (stat.isFile()) {
    return root.endsWith(".md") ? [root] : [];
  }
  if (!stat.isDirectory()) {
    return [];
  }

  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => walkMarkdownFiles(path.join(root, entry.name))));
  return nested.flat();
}

function normalizeLinkTarget(target: string): string {
  return target.replace(/^<|>$/g, "");
}

function shouldSkipLink(target: string): boolean {
  return (
    target.startsWith("#") ||
    target.startsWith("http://") ||
    target.startsWith("https://") ||
    target.startsWith("mailto:") ||
    target.startsWith("tel:")
  );
}

function assertContainsAll(file: string, text: string, requiredValues: string[], failures: DocCheckFailure[]): void {
  for (const value of requiredValues) {
    if (!text.includes(value)) {
      failures.push({
        file,
        message: `missing required content: ${value}`
      });
    }
  }
}

export async function checkDocsReadiness(cwd = process.cwd()): Promise<DocCheckResult> {
  const failures: DocCheckFailure[] = [];
  const checkedFiles: string[] = [];

  for (const requiredDoc of requiredDocs) {
    const abs = path.resolve(cwd, requiredDoc);
    if (!existsSync(abs)) {
      failures.push({
        file: requiredDoc,
        message: "required documentation file is missing"
      });
    }
  }

  const markdownFiles = await walkMarkdownFiles(path.resolve(cwd, docsRoot));
  for (const absoluteFile of markdownFiles) {
    const relFile = path.relative(cwd, absoluteFile).replace(/\\/g, "/");
    checkedFiles.push(relFile);
    const text = await readFile(absoluteFile, "utf8");

    for (const match of text.matchAll(markdownLinkPattern)) {
      const target = normalizeLinkTarget(match[1] ?? "");
      if (!target || shouldSkipLink(target)) {
        continue;
      }

      const targetWithoutAnchor = target.split("#")[0];
      if (!targetWithoutAnchor) {
        continue;
      }

      const resolvedTarget = path.resolve(path.dirname(absoluteFile), targetWithoutAnchor);
      if (!existsSync(resolvedTarget)) {
        failures.push({
          file: relFile,
          message: `broken local link: ${target}`
        });
      }
    }
  }

  const localDevPath = path.resolve(cwd, "docs/getting-started/local-dev.md");
  if (existsSync(localDevPath)) {
    assertContainsAll("docs/getting-started/local-dev.md", await readFile(localDevPath, "utf8"), requiredLocalDevCommands, failures);
  }

  const openApiPath = path.resolve(cwd, "docs/api/openapi.yaml");
  if (existsSync(openApiPath)) {
    assertContainsAll("docs/api/openapi.yaml", await readFile(openApiPath, "utf8"), requiredOpenApiPaths, failures);
  }

  const safetyPolicyPath = path.resolve(cwd, "docs/security/safety-policy.md");
  if (existsSync(safetyPolicyPath)) {
    assertContainsAll("docs/security/safety-policy.md", await readFile(safetyPolicyPath, "utf8"), requiredSafetySections, failures);
  }

  return {
    checkedFiles: checkedFiles.sort(),
    failures
  };
}

async function main(): Promise<void> {
  const result = await checkDocsReadiness();
  if (result.failures.length > 0) {
    console.error(`Documentation check failed with ${result.failures.length} issue${result.failures.length === 1 ? "" : "s"}.`);
    for (const failure of result.failures) {
      console.error(`${failure.file}: ${failure.message}`);
    }
    process.exit(1);
  }

  console.log(`Documentation check passed for ${result.checkedFiles.length} markdown file${result.checkedFiles.length === 1 ? "" : "s"}.`);
}

if (process.argv[1] && path.basename(process.argv[1]) === "check-docs.ts") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
