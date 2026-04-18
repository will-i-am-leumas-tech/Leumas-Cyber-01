import type { ValidationTemplate } from "../schemas/validation-v2.schema";

const templates: ValidationTemplate[] = [
  {
    id: "safe-control-validation",
    title: "Safe Control Validation Replay",
    objective: "Replay benign telemetry that should exercise detection and alert-routing controls.",
    category: "control-validation",
    allowedTelemetry: ["process_creation:powershell_encoded", "alert:encoded_powershell", "ticket_created"],
    blockedContent: ["payloads", "exploit chains", "credential theft", "stealth", "persistence"],
    requiredControls: ["endpoint process logging", "siem alert routing"],
    attackMapping: ["T1059 Command and Scripting Interpreter"],
    requiresLabMode: true,
    safetyNotes: ["Replay benign telemetry only. Do not execute payloads, exploit code, or intrusive procedures."]
  },
  {
    id: "identity-monitoring-replay",
    title: "Identity Monitoring Replay",
    objective: "Replay approved authentication telemetry for alert-routing validation.",
    category: "identity-validation",
    allowedTelemetry: ["auth_failure", "alert:auth_failure_burst"],
    blockedContent: ["password guessing", "credential collection", "account takeover"],
    requiredControls: ["identity sign-in logging", "identity alert routing"],
    attackMapping: ["T1110 Brute Force"],
    requiresLabMode: true,
    safetyNotes: ["Use synthetic sign-in telemetry and approved lab identities only."]
  }
];

export function listValidationTemplates(): ValidationTemplate[] {
  return templates.map((template) => ({
    ...template,
    allowedTelemetry: [...template.allowedTelemetry],
    blockedContent: [...template.blockedContent],
    requiredControls: [...template.requiredControls],
    attackMapping: [...template.attackMapping],
    safetyNotes: [...template.safetyNotes]
  }));
}

export function getValidationTemplate(templateId: string): ValidationTemplate | undefined {
  return listValidationTemplates().find((template) => template.id === templateId);
}
