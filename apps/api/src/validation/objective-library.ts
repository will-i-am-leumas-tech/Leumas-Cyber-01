import type { TelemetryExpectation, ValidationObjective } from "../schemas/validation.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export interface ValidationObjectiveTemplate {
  id: string;
  title: string;
  category: string;
  telemetry: Array<Omit<TelemetryExpectation, "id" | "campaignId" | "objectiveId">>;
  successCriteria: string[];
  safetyNotes: string[];
}

export const unsafeValidationPatterns: Array<[string, RegExp]> = [
  ["payload_or_shell", /\b(reverse shell|bind shell|payload|shellcode|dropper|stager)\b/i],
  ["weaponization", /\b(weaponize|exploit chain|ransomware|malware|keylogger|trojan)\b/i],
  ["credential_theft", /\b(steal|dump|harvest|exfiltrate)\b.{0,80}\b(credentials?|passwords?|tokens?|hashes?|cookies?)\b/i],
  ["stealth_or_evasion", /\b(bypass edr|bypass antivirus|evade detection|disable defender|persistence|uac bypass)\b/i],
  ["intrusion_procedure", /\b(gain access|break into|lateral movement|pivot|pass[-\s]?the[-\s]?hash|dcsync)\b/i]
];

const objectiveTemplates: ValidationObjectiveTemplate[] = [
  {
    id: "detect-encoded-powershell",
    title: "Validate Encoded PowerShell Detection Coverage",
    category: "execution-detection",
    telemetry: [
      {
        dataSource: "endpoint.process_creation",
        expectedEventType: "process_creation:powershell_encoded",
        detectionRuleRef: "detection_rule_001",
        required: true
      },
      {
        dataSource: "siem.alerts",
        expectedEventType: "alert:encoded_powershell",
        detectionRuleRef: "Suspicious Encoded PowerShell Execution",
        required: true
      }
    ],
    successCriteria: [
      "Process creation telemetry is visible in the approved monitoring platform.",
      "The defensive detection produces an alert or documented non-alert reason.",
      "No procedural exploit, evasion, persistence, or credential collection steps are generated."
    ],
    safetyNotes: ["Use pre-approved benign simulator events or replayed logs; do not create executable artifacts or intrusion steps."]
  },
  {
    id: "auth-failure-monitoring",
    title: "Validate Authentication Failure Monitoring",
    category: "identity-detection",
    telemetry: [
      {
        dataSource: "identity.authentication",
        expectedEventType: "auth_failure",
        detectionRuleRef: "Failed Authentication Burst",
        required: true
      }
    ],
    successCriteria: [
      "Authentication failure telemetry is received.",
      "Alert thresholds and ownership are documented.",
      "Remediation tasks are opened for any missing log source or alert routing gap."
    ],
    safetyNotes: ["Use authorized test accounts and approved identity telemetry; do not request or collect credentials."]
  },
  {
    id: "control-block-verification",
    title: "Validate Control Block And Alert Routing",
    category: "control-validation",
    telemetry: [
      {
        dataSource: "security_control.events",
        expectedEventType: "control_block",
        required: true
      },
      {
        dataSource: "case_management",
        expectedEventType: "ticket_created",
        required: false
      }
    ],
    successCriteria: [
      "The expected security control event is recorded.",
      "Alert routing reaches the documented owner.",
      "Any missing evidence results in a defensive remediation task."
    ],
    safetyNotes: ["Validate control outcomes with approved benign events only."]
  }
];

export function getValidationObjectiveTemplates(): ValidationObjectiveTemplate[] {
  return objectiveTemplates.map((template) => ({
    ...template,
    telemetry: template.telemetry.map((item) => ({ ...item })),
    successCriteria: [...template.successCriteria],
    safetyNotes: [...template.safetyNotes]
  }));
}

export function getValidationObjectiveTemplate(templateId: string): ValidationObjectiveTemplate | undefined {
  return getValidationObjectiveTemplates().find((template) => template.id === templateId);
}

export function assertSafeValidationText(text: string | undefined): string[] {
  if (!text?.trim()) {
    return [];
  }

  return unsafeValidationPatterns.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

export function buildValidationObjective(campaignId: string, template: ValidationObjectiveTemplate): ValidationObjective {
  const objectiveId = createId("validation_objective");
  const expectedTelemetry = template.telemetry.map((item) => ({
    id: createId("telemetry_expectation"),
    campaignId,
    objectiveId,
    dataSource: item.dataSource,
    expectedEventType: item.expectedEventType,
    detectionRuleRef: item.detectionRuleRef,
    required: item.required
  }));

  return {
    id: objectiveId,
    campaignId,
    templateId: template.id,
    title: template.title,
    category: template.category,
    expectedTelemetry,
    successCriteria: template.successCriteria,
    safetyNotes: template.safetyNotes,
    createdAt: nowIso()
  };
}
