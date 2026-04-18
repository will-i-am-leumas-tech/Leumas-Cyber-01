import type { AnalysisResult } from "../schemas/result.schema";
import { normalizeIndicators } from "../utils/indicators";

const guides: Array<{
  signal: RegExp;
  title: string;
  evidence: string[];
  actions: string[];
}> = [
  {
    signal: /\brdp|remote desktop\b/i,
    title: "RDP Hardening Checklist",
    evidence: ["Request references Remote Desktop exposure or configuration."],
    actions: [
      "Require MFA for remote access paths that can reach RDP.",
      "Restrict RDP to VPN, bastion hosts, or managed admin workstations.",
      "Disable direct internet exposure and verify firewall scope.",
      "Enable Network Level Authentication and strong lockout policies.",
      "Forward Windows security events 4624, 4625, 4776, and 4771 to central logging."
    ]
  },
  {
    signal: /\biis|internet information services\b/i,
    title: "IIS Hardening Checklist",
    evidence: ["Request references IIS or Windows web server hardening."],
    actions: [
      "Remove unused IIS modules, handlers, sample content, and legacy features.",
      "Enforce TLS 1.2 or newer with approved cipher suites.",
      "Run application pools with least-privilege identities.",
      "Enable detailed request logging and forward logs to the SIEM.",
      "Apply current Windows and .NET security updates in a tested maintenance window."
    ]
  },
  {
    signal: /\blogging|windows event|audit policy|sysmon\b/i,
    title: "Windows Logging Improvement Checklist",
    evidence: ["Request references Windows logging or audit visibility."],
    actions: [
      "Enable advanced audit policies for logon, process creation, account changes, and object access where needed.",
      "Collect PowerShell module, script block, and transcription logs for administrative systems.",
      "Deploy a reviewed Sysmon configuration and tune noisy events.",
      "Centralize logs with retention that matches incident response needs.",
      "Create detections for suspicious process chains, encoded PowerShell, and repeated authentication failures."
    ]
  },
  {
    signal: /\bmfa|multi[-\s]?factor|authenticator\b/i,
    title: "MFA Rollout Checklist",
    evidence: ["Request references multi-factor authentication."],
    actions: [
      "Require phishing-resistant MFA for administrators and high-risk users first.",
      "Block legacy authentication protocols that cannot enforce MFA.",
      "Create break-glass accounts with strong controls and monitored use.",
      "Review conditional access policies for impossible travel and risky sign-ins.",
      "Measure enrollment, bypasses, and failed challenge rates weekly during rollout."
    ]
  }
];

export function analyzeHardening(text: string): Omit<AnalysisResult, "reportMarkdown"> {
  const guide = guides.find((candidate) => candidate.signal.test(text));
  const selected = guide ?? {
    title: "Defensive Hardening Checklist",
    evidence: ["Request asks for defensive security hardening guidance."],
    actions: [
      "Inventory exposed services and remove or restrict anything unnecessary.",
      "Patch operating systems, applications, and externally reachable services.",
      "Enforce least privilege for users, services, and administrative workflows.",
      "Centralize security logs and create alerting for high-risk control failures.",
      "Document owners, due dates, validation steps, and rollback plans for each remediation task."
    ]
  };

  return {
    title: selected.title,
    severity: "low",
    confidence: 0.84,
    category: "hardening",
    summary: "Defensive hardening guidance was generated as a prioritized checklist.",
    evidence: selected.evidence,
    recommendedActions: selected.actions,
    indicators: normalizeIndicators(text),
    timeline: [],
    notes: ["Guidance is defensive and avoids exploit, bypass, and intrusion instructions."]
  };
}
