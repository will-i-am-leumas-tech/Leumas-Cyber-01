import type { DetectionCoverage, DetectionIntent, DetectionRule, SigmaLikeRule } from "../schemas/detections.schema";
import { nowIso } from "../utils/time";
import { translateSigmaLikeToPseudoQuery } from "./query-translator";

function coverageForIntent(intent: DetectionIntent): DetectionCoverage {
  if (intent.category === "execution") {
    return {
      tactic: "Execution",
      technique: "Command and Scripting Interpreter",
      dataSource: "Process Creation",
      confidence: 0.82
    };
  }

  if (intent.category === "credential-access") {
    return {
      tactic: "Credential Access",
      technique: "Brute Force",
      dataSource: "Authentication Logs",
      confidence: 0.8
    };
  }

  return {
    tactic: "Defensive Monitoring",
    technique: intent.category,
    dataSource: intent.dataSources[0] ?? "SIEM Events",
    confidence: 0.65
  };
}

function sigmaForIntent(intent: DetectionIntent, ruleId: string): SigmaLikeRule {
  if (intent.category === "execution") {
    return {
      title: "Suspicious Encoded PowerShell Execution",
      id: ruleId,
      status: "experimental",
      description: "Detects PowerShell process creation with encoded command indicators for defensive triage.",
      logsource: {
        product: "windows",
        category: "process_creation"
      },
      detection: {
        selection: {
          "process.image": ["powershell.exe", "pwsh.exe"],
          "process.commandLine": ["-EncodedCommand", "-enc", "FromBase64String"]
        },
        condition: "selection"
      },
      fields: ["timestamp", "host", "user", "process.image", "process.commandLine", "process.parentImage"],
      falsepositives: ["Administrative automation and software deployment tools may use encoded PowerShell."],
      level: intent.severity
    };
  }

  if (intent.category === "credential-access") {
    return {
      title: "Failed Authentication Burst",
      id: ruleId,
      status: "experimental",
      description: "Detects repeated authentication failures that may indicate brute-force or password spraying activity.",
      logsource: {
        product: "identity",
        category: "authentication"
      },
      detection: {
        selection: {
          eventType: ["auth_failure", "failed login", "authentication failed", "4625"]
        },
        condition: "selection"
      },
      fields: ["timestamp", "user", "srcIp", "host", "eventType"],
      falsepositives: ["Forgotten passwords, stale service credentials, and misconfigured scheduled jobs."],
      level: intent.severity
    };
  }

  return {
    title: `Monitor ${intent.category}`,
    id: ruleId,
    status: "experimental",
    description: `Detects events relevant to ${intent.behavior}.`,
    logsource: {
      product: "siem",
      category: "events"
    },
    detection: {
      selection: {
        eventType: [intent.category]
      },
      condition: "selection"
    },
    fields: ["timestamp", "host", "user", "srcIp", "eventType"],
    falsepositives: ["Expected administrative or business activity that matches the same high-level category."],
    level: intent.severity
  };
}

export function buildSigmaLikeRule(intent: DetectionIntent, index: number): DetectionRule {
  const ruleId = `detection_rule_${String(index).padStart(3, "0")}`;
  const logic = sigmaForIntent(intent, ruleId);
  const query = translateSigmaLikeToPseudoQuery(logic);

  return {
    id: ruleId,
    intentId: intent.id,
    format: "sigma-like-json",
    title: logic.title,
    logic,
    query,
    fields: logic.fields,
    falsePositiveNotes: logic.falsepositives,
    validationStatus: "untested",
    coverage: coverageForIntent(intent),
    exportText: JSON.stringify(logic, null, 2),
    createdAt: nowIso()
  };
}
