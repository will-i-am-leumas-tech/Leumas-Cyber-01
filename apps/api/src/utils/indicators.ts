import net from "node:net";
import type { Indicator } from "../schemas/result.schema";

const fileLikeTlds = new Set([
  "bat",
  "cmd",
  "conf",
  "csv",
  "dll",
  "exe",
  "gz",
  "ini",
  "json",
  "local",
  "log",
  "ps1",
  "tar",
  "tmp",
  "txt",
  "zip"
]);

function cleanToken(value: string): string {
  return value.replace(/^[\s"'([{<]+/, "").replace(/[\s"',;)\]}>]+$/, "");
}

function addIndicator(items: Indicator[], seen: Set<string>, indicator: Indicator): void {
  const normalized = indicator.normalized.trim();
  if (!normalized) {
    return;
  }

  const key = `${indicator.type}:${normalized.toLowerCase()}`;
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  items.push({ ...indicator, normalized });
}

function normalizeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return null;
  }
}

export function normalizeIndicators(input: string): Indicator[] {
  const indicators: Indicator[] = [];
  const seen = new Set<string>();
  const text = input.replace(/\u0000/g, "");

  for (const match of text.matchAll(/\bhttps?:\/\/[^\s<>"']+/gi)) {
    const raw = cleanToken(match[0]);
    const normalized = normalizeUrl(raw);
    if (!normalized) {
      continue;
    }

    addIndicator(indicators, seen, {
      type: "url",
      value: raw,
      normalized,
      source: "url"
    });

    try {
      const host = new URL(normalized).hostname;
      const ipVersion = net.isIP(host);
      addIndicator(indicators, seen, {
        type: ipVersion === 4 ? "ipv4" : ipVersion === 6 ? "ipv6" : "domain",
        value: host,
        normalized: host.toLowerCase(),
        source: "url-host"
      });
    } catch {
      // URL was already validated. Ignore impossible parser failures.
    }
  }

  const hashPatterns: Array<[Indicator["type"], RegExp]> = [
    ["sha256", /\b[a-fA-F0-9]{64}\b/g],
    ["sha1", /\b[a-fA-F0-9]{40}\b/g],
    ["md5", /\b[a-fA-F0-9]{32}\b/g]
  ];

  for (const [type, pattern] of hashPatterns) {
    for (const match of text.matchAll(pattern)) {
      addIndicator(indicators, seen, {
        type,
        value: match[0],
        normalized: match[0].toLowerCase(),
        source: "hash"
      });
    }
  }

  for (const match of text.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)) {
    const value = match[0];
    if (net.isIP(value) === 4) {
      addIndicator(indicators, seen, {
        type: "ipv4",
        value,
        normalized: value,
        source: "ip"
      });
    }
  }

  for (const match of text.matchAll(/\b(?:[a-fA-F0-9]{0,4}:){2,}[a-fA-F0-9:.]{1,}\b/g)) {
    const value = cleanToken(match[0]);
    if (net.isIP(value) === 6) {
      addIndicator(indicators, seen, {
        type: "ipv6",
        value,
        normalized: value.toLowerCase(),
        source: "ip"
      });
    }
  }

  for (const match of text.matchAll(/\b(?:HKLM|HKCU|HKCR|HKU|HKCC|HKEY_LOCAL_MACHINE|HKEY_CURRENT_USER|HKEY_CLASSES_ROOT|HKEY_USERS|HKEY_CURRENT_CONFIG)\\[^\s,;]+/gi)) {
    const value = cleanToken(match[0]);
    addIndicator(indicators, seen, {
      type: "registry_key",
      value,
      normalized: value.toLowerCase(),
      source: "registry"
    });
  }

  for (const match of text.matchAll(/\b[A-Za-z]:\\[^\s"']+/g)) {
    const value = cleanToken(match[0]);
    addIndicator(indicators, seen, {
      type: "file_path",
      value,
      normalized: value,
      source: "file-path"
    });
  }

  for (const match of text.matchAll(/(?:^|\s)(\/(?:[A-Za-z0-9._-]+\/)+[A-Za-z0-9._-]+)/g)) {
    const value = cleanToken(match[1]);
    addIndicator(indicators, seen, {
      type: "file_path",
      value,
      normalized: value,
      source: "file-path"
    });
  }

  for (const match of text.matchAll(/\b[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}\b/g)) {
    const value = cleanToken(match[0]).toLowerCase();
    const tld = value.split(".").pop() ?? "";
    if (fileLikeTlds.has(tld) || net.isIP(value)) {
      continue;
    }

    addIndicator(indicators, seen, {
      type: "domain",
      value,
      normalized: value,
      source: "domain"
    });
  }

  for (const match of text.matchAll(/\b(?:host|hostname|computer|device|endpoint|asset)\s*[=:]\s*([A-Za-z0-9][A-Za-z0-9_-]{1,62})\b/gi)) {
    const value = cleanToken(match[1]).toLowerCase();
    addIndicator(indicators, seen, {
      type: "hostname",
      value,
      normalized: value,
      source: "hostname"
    });
  }

  return indicators;
}
