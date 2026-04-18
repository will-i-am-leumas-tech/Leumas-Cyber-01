import { describe, expect, it } from "vitest";
import { normalizeIndicators } from "../../apps/api/src/utils/indicators";

describe("indicator normalizer", () => {
  it("classifies and deduplicates common indicator types", () => {
    const indicators = normalizeIndicators(`
      203.0.113.10
      203.0.113.10
      2001:db8::24
      https://example-threat.test/login
      bad-control.example
      44d88612fea8a8f36de82e1278abb02f
      HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Updater
      C:\\Windows\\Temp\\updater.exe
      host=WS-42
    `);

    expect(indicators.map((indicator) => indicator.type)).toEqual(
      expect.arrayContaining(["ipv4", "ipv6", "url", "domain", "md5", "registry_key", "file_path", "hostname"])
    );
    expect(indicators.filter((indicator) => indicator.normalized === "203.0.113.10")).toHaveLength(1);
  });
});
