import type { OutputSafetyResult } from "../schemas/safety.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import { safetyPolicyVersion } from "./policy-engine";

const unsafeOutputPatterns: Array<[string, RegExp]> = [
  ["exploit_or_payload_instructions", /\b(exploit chain|weaponized payload|reverse shell|shellcode|dropper|stager)\b/i],
  ["malware_or_ransomware_logic", /\b(write|create|generate|build|modify)\b.{0,80}\b(malware|ransomware|trojan|keylogger|rootkit)\b/i],
  ["credential_theft_workflow", /\b(steal|dump|harvest|exfiltrate)\b.{0,80}\b(credentials?|passwords?|tokens?|cookies?|hashes?)\b/i],
  ["persistence_or_evasion", /\b(persistence|bypass edr|bypass antivirus|evade detection|disable defender)\b/i],
  ["unauthorized_intrusion", /\b(break into|compromise the target|gain unauthorized access)\b/i]
];

export function validateOutputSafety(output: string): OutputSafetyResult {
  const blockedSegments = unsafeOutputPatterns.filter(([, pattern]) => pattern.test(output)).map(([name]) => name);
  if (blockedSegments.length === 0) {
    return {
      id: createId("output_safety"),
      allowed: true,
      blockedSegments: [],
      policyVersion: safetyPolicyVersion,
      createdAt: nowIso()
    };
  }

  return {
    id: createId("output_safety"),
    allowed: false,
    blockedSegments,
    repairedOutput: "Provider output withheld. Continue with deterministic defensive analysis only.",
    reason: "unsafe_output_detected",
    policyVersion: safetyPolicyVersion,
    createdAt: nowIso()
  };
}
