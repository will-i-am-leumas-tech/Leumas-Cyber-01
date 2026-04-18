import type { AnalysisMode } from "../schemas/input.schema";
import type { AnalysisResult, Severity } from "../schemas/result.schema";
import { buildTimeline } from "../services/timeline-service";
import { normalizeIndicators } from "../utils/indicators";

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

export function analyzeAlertOrLogs(text: string, mode: Extract<AnalysisMode, "alert" | "logs">): Omit<AnalysisResult, "reportMarkdown"> {
  const lower = text.toLowerCase();
  const evidence: string[] = [];
  const recommendedActions: string[] = [];
  let title = mode === "alert" ? "Security Alert Review" : "Log Review";
  let severity: Severity = "low";
  let confidence = 0.6;
  let category = "general-monitoring";
  let summary = "The submitted security data was reviewed with deterministic defensive heuristics.";

  const powershellEncoded = /\bpowershell(?:\.exe)?\b/i.test(text) && /(-enc|-encodedcommand|frombase64string|base64)/i.test(text);
  const suspiciousProcessChain = /\b(winword|excel|outlook|wscript|cscript|mshta|rundll32|regsvr32)\.exe\b/i.test(text) && /\b(powershell|cmd|wscript|cscript|mshta)\.exe\b/i.test(text);
  const failedLoginCount = countMatches(lower, /\b(failed login|authentication failed|invalid password|event id[:= ]?4625|status=failure|failure)\b/g);
  const successfulLoginAfterFailures = failedLoginCount >= 3 && /\b(successful login|accepted password|event id[:= ]?4624|status=success|login success)\b/i.test(text);
  const defenderDisabled = /\b(disable|disabled|stopped)\b.{0,40}\b(defender|antivirus|edr|security service)\b/i.test(text);

  if (powershellEncoded) {
    title = "Suspicious PowerShell Execution";
    severity = "high";
    confidence = 0.86;
    category = "execution";
    summary = "PowerShell execution includes encoded or base64-like command behavior that is commonly associated with suspicious automation.";
    evidence.push("PowerShell execution was observed.");
    evidence.push("Command line contains encoded-command or base64-like behavior.");
    recommendedActions.push(
      "Confirm whether the PowerShell activity was authorized administrative work.",
      "Collect the parent-child process tree and command-line telemetry.",
      "Preserve relevant endpoint logs and PowerShell script block logs.",
      "Search for similar encoded PowerShell executions across endpoints."
    );
  }

  if (suspiciousProcessChain) {
    severity = severity === "low" ? "medium" : severity;
    confidence = Math.max(confidence, 0.78);
    category = category === "general-monitoring" ? "execution" : category;
    evidence.push("A user-facing or script host process appears near a shell or scripting interpreter.");
    recommendedActions.push("Review the process ancestry and the initiating user session.");
  }

  if (successfulLoginAfterFailures) {
    title = "Failed Login Burst Followed by Success";
    severity = "high";
    confidence = Math.max(confidence, 0.84);
    category = "credential-access";
    summary = "Repeated authentication failures followed by a successful login may indicate password spraying, brute force, or credential stuffing.";
    evidence.push(`${failedLoginCount} failed authentication event${failedLoginCount === 1 ? "" : "s"} were observed.`);
    evidence.push("A successful login appears after repeated failures.");
    recommendedActions.push(
      "Reset or verify the affected account credentials.",
      "Review MFA status, conditional access decisions, and source network reputation.",
      "Search for additional failed login bursts against other accounts.",
      "Preserve identity provider and VPN logs for the suspicious time window."
    );
  } else if (failedLoginCount >= 3) {
    title = "Repeated Failed Login Activity";
    severity = severity === "low" ? "medium" : severity;
    confidence = Math.max(confidence, 0.77);
    category = category === "general-monitoring" ? "credential-access" : category;
    summary = "Multiple failed authentication attempts were observed and should be reviewed for brute-force or password spraying behavior.";
    evidence.push(`${failedLoginCount} failed authentication event${failedLoginCount === 1 ? "" : "s"} were observed.`);
    recommendedActions.push(
      "Identify source addresses, targeted accounts, and authentication method.",
      "Apply lockout, MFA, or conditional access controls where appropriate."
    );
  }

  if (defenderDisabled) {
    severity = "critical";
    confidence = Math.max(confidence, 0.82);
    category = "defense-evasion";
    evidence.push("Security tooling appears to have been disabled or stopped.");
    recommendedActions.push("Verify endpoint protection health and isolate the asset if the change was unauthorized.");
  }

  if (recommendedActions.length === 0) {
    recommendedActions.push(
      "Validate the source and timestamp of the submitted data.",
      "Correlate the event with endpoint, identity, DNS, proxy, and firewall telemetry.",
      "Document analyst assumptions and preserve the original evidence."
    );
  }

  if (evidence.length === 0) {
    evidence.push("No high-confidence suspicious pattern was identified by the MVP heuristics.");
  }

  return {
    title,
    severity,
    confidence,
    category,
    summary,
    evidence: unique(evidence),
    recommendedActions: unique(recommendedActions),
    indicators: normalizeIndicators(text),
    timeline: buildTimeline(text),
    notes: ["This MVP result is heuristic and should be validated with source telemetry."]
  };
}
