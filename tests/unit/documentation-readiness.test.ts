import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { openApiDocument } from "../../apps/api/src/docs/openapi-document";
import { checkDocsReadiness } from "../../scripts/check-docs";

describe("documentation readiness", () => {
  it("passes the operator documentation readiness checks", async () => {
    const result = await checkDocsReadiness();

    expect(result.failures).toEqual([]);
    expect(result.checkedFiles).toEqual(expect.arrayContaining(["docs/README.md", "docs/security/safety-policy.md"]));
  });

  it("keeps the static OpenAPI file aligned with the served OpenAPI paths", async () => {
    const openApiYaml = await readFile("docs/api/openapi.yaml", "utf8");
    const paths = Object.keys(openApiDocument.paths);

    expect(paths).toEqual(
      expect.arrayContaining(["/health", "/analyze", "/cases/{id}", "/safety/evaluate", "/docs/openapi.json"])
    );
    for (const apiPath of paths) {
      expect(openApiYaml).toContain(`${apiPath}:`);
    }
  });

  it("documents allowed, blocked, ambiguous, and safe redirect safety examples", async () => {
    const safetyPolicy = await readFile("docs/security/safety-policy.md", "utf8");

    expect(safetyPolicy).toContain("Allowed example");
    expect(safetyPolicy).toContain("Blocked example");
    expect(safetyPolicy).toContain("Ambiguous example");
    expect(safetyPolicy).toContain("Safe redirect");
    expect(safetyPolicy).toContain("credential theft");
  });
});
