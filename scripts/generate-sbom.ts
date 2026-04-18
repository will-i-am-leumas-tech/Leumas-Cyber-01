import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

interface LockPackage {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface PackageLock {
  name: string;
  version: string;
  packages: Record<string, LockPackage>;
}

function packageNameFromPath(pkgPath: string, pkg: LockPackage): string | undefined {
  if (pkg.name) {
    return pkg.name;
  }
  const nodeModulesIndex = pkgPath.lastIndexOf("node_modules/");
  if (nodeModulesIndex === -1) {
    return undefined;
  }
  return pkgPath.slice(nodeModulesIndex + "node_modules/".length);
}

export async function generateSbom(outputPath = "tmp/sbom.json"): Promise<Record<string, unknown>> {
  const lock = JSON.parse(await readFile("package-lock.json", "utf8")) as PackageLock;
  const components = Object.entries(lock.packages)
    .flatMap(([pkgPath, pkg]) => {
      const name = packageNameFromPath(pkgPath, pkg);
      if (pkgPath === "" || !name || !pkg.version) {
        return [];
      }
      return [
        {
          type: "library",
          name,
          version: pkg.version,
          purl: `pkg:npm/${encodeURIComponent(name)}@${pkg.version}`,
          scope: pkgPath.startsWith("node_modules/") ? "required" : "workspace"
        }
      ];
    })
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  const sbom = {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: `urn:uuid:${randomUUID()}`,
    version: 1,
    metadata: {
      component: {
        type: "application",
        name: lock.name,
        version: lock.version
      }
    },
    components
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(sbom, null, 2)}\n`, "utf8");
  return sbom;
}

async function main(): Promise<void> {
  const outputPath = process.argv[2] ?? "tmp/sbom.json";
  const sbom = await generateSbom(outputPath);
  console.log(`SBOM written to ${outputPath} with ${(sbom.components as unknown[]).length} components.`);
}

if (process.argv[1] && path.basename(process.argv[1]) === "generate-sbom.ts") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
