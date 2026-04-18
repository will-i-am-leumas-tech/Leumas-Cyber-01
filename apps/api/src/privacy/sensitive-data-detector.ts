import type { SensitiveFinding, SensitiveFindingType } from "../schemas/privacy.schema";
import type { DataClass } from "../schemas/privacy.schema";
import { sha256Text } from "../reasoning/hash";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

interface SensitivePattern {
  type: SensitiveFindingType;
  confidence: number;
  pattern: RegExp;
}

const sensitivePatterns: SensitivePattern[] = [
  {
    type: "private_key",
    confidence: 0.99,
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g
  },
  {
    type: "cloud_access_key",
    confidence: 0.95,
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g
  },
  {
    type: "api_key",
    confidence: 0.9,
    pattern: /\b(?:api[_-]?key|client[_-]?secret|secret[_-]?key)\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{12,}/gi
  },
  {
    type: "token",
    confidence: 0.88,
    pattern: /\b(?:bearer|token|access[_-]?token|refresh[_-]?token)\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{16,}/gi
  },
  {
    type: "secret",
    confidence: 0.86,
    pattern: /\b(?:password|passwd|pwd|secret)\s*[:=]\s*["']?[^"'\s`]{8,}/gi
  },
  {
    type: "email",
    confidence: 0.8,
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
  },
  {
    type: "username",
    confidence: 0.72,
    pattern: /\b(?:user|username|account)\s*[:=]\s*["']?[A-Za-z0-9_.\\@-]{3,}/gi
  }
];

function findingFingerprint(value: string): string {
  return sha256Text(value).slice(0, 16);
}

function replacementFor(type: SensitiveFindingType, index: number): string {
  return `[REDACTED_${type.toUpperCase()}_${String(index).padStart(3, "0")}]`;
}

export function detectSensitiveData(text: string, sourceRef = "input"): SensitiveFinding[] {
  const findings: SensitiveFinding[] = [];
  const occupied = new Set<number>();

  for (const sensitivePattern of sensitivePatterns) {
    for (const match of text.matchAll(sensitivePattern.pattern)) {
      const value = match[0];
      const start = match.index ?? 0;
      const end = start + value.length;
      const overlaps = Array.from({ length: end - start }, (_, offset) => start + offset).some((position) => occupied.has(position));
      if (overlaps) {
        continue;
      }

      for (let position = start; position < end; position += 1) {
        occupied.add(position);
      }

      findings.push({
        id: createId("sensitive_finding"),
        type: sensitivePattern.type,
        sourceRef,
        start,
        end,
        confidence: sensitivePattern.confidence,
        redactionValue: replacementFor(sensitivePattern.type, 0),
        fingerprintHash: findingFingerprint(value),
        length: value.length,
        createdAt: nowIso()
      });
    }
  }

  return findings
    .sort((a, b) => a.start - b.start)
    .map((finding, index) => ({
      ...finding,
      redactionValue: replacementFor(finding.type, index + 1)
    }));
}

export function summarizeSensitiveFindings(findings: SensitiveFinding[]): Record<string, number> {
  return findings.reduce<Record<string, number>>((summary, finding) => {
    summary[finding.type] = (summary[finding.type] ?? 0) + 1;
    return summary;
  }, {});
}

export function classifySensitiveData(findings: SensitiveFinding[]): DataClass {
  if (findings.some((finding) => ["api_key", "cloud_access_key", "private_key", "secret", "token"].includes(finding.type))) {
    return "restricted";
  }
  if (findings.some((finding) => ["email", "username"].includes(finding.type))) {
    return "confidential";
  }
  return "internal";
}
