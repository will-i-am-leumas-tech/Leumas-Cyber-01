import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { buildAuthorizationScope, evaluateScopeForCampaign } from "../../apps/api/src/validation/authorization-service";
import { assertSafeValidationText, getValidationObjectiveTemplates } from "../../apps/api/src/validation/objective-library";

describe("authorized validation services", () => {
  it("blocks campaign creation when authorization scope is expired", async () => {
    const fixture = JSON.parse(await readFile("data/fixtures/validation/expired-scope.json", "utf8"));
    const scope = buildAuthorizationScope(fixture);
    const result = evaluateScopeForCampaign(scope, "2026-04-17T00:00:00.000Z");

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("authorization_scope_expired_or_not_started");
  });

  it("keeps objective templates at control and telemetry level", () => {
    const templates = getValidationObjectiveTemplates();
    const serialized = JSON.stringify(templates);

    expect(templates.length).toBeGreaterThanOrEqual(2);
    expect(serialized).not.toMatch(/reverse shell|shellcode|exploit chain|bypass edr|lateral movement/i);
    expect(templates.flatMap((template) => template.telemetry).length).toBeGreaterThan(0);
  });

  it("refuses unsafe requested steps even inside a validation campaign", async () => {
    const text = await readFile("data/fixtures/validation/blocked-weaponization-request.txt", "utf8");
    const unsafeMatches = assertSafeValidationText(text);

    expect(unsafeMatches).toEqual(expect.arrayContaining(["payload_or_shell", "stealth_or_evasion"]));
  });
});
