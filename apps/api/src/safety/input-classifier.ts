import type { AnalysisMode } from "../schemas/input.schema";
import type { SafetyCategory } from "../schemas/safety.schema";

export interface InputClassification {
  category: SafetyCategory;
  harmfulSignals: string[];
  intentSignals: string[];
  contextSignals: string[];
  looksLikeArtifact: boolean;
}

const harmfulCapabilitySignals: Array<[string, RegExp]> = [
  ["exploit_development", /\b(exploit(?:ability|able|ing)?|weaponize|0day|zero-day|shellcode)\b/i],
  ["malware_creation", /\b(malware|ransomware|trojan|worm|keylogger|rootkit|backdoor)\b/i],
  ["phishing_kit", /\b(phishing kit|phish kit|credential phishing|fake login page)\b/i],
  ["credential_theft", /\b(steal|dump|exfiltrate|harvest|phish|phishing)\b.{0,80}\b(password|credential|cookie|token|hash|session)\b/i],
  ["payload_creation", /\b(payload|reverse shell|bind shell|stager|dropper)\b/i],
  ["persistence_or_evasion", /\b(persistence|bypass antivirus|bypass edr|evade detection|disable defender|uac bypass)\b/i],
  ["lateral_movement", /\b(lateral movement|pass[-\s]?the[-\s]?hash|kerberoast|dcsync|pivot)\b/i],
  ["identity_privilege_abuse", /\b(bypass mfa|bypass conditional access|abuse admin role|privilege escalation|escalate privileges)\b/i],
  ["offensive_recon", /\b(scan|enumerate|recon)\b.{0,80}\b(target|victim|public ip|company|domain)\b/i]
];

const requestIntentSignals: Array<[string, RegExp]> = [
  ["instructional_intent", /\b(how do i|show me how|teach me|walk me through|step[-\s]?by[-\s]?step|instructions?)\b/i],
  ["creation_intent", /\b(write|create|build|generate|make|code|script|develop)\b/i],
  ["operational_intent", /\b(run|execute|deploy|launch|break into|compromise|gain access|take over)\b/i]
];

const contextSignals: Array<[string, RegExp]> = [
  ["defensive_context", /\b(detect|detection|analy[sz]e|triage|investigate|incident response|hardening|secure|defend|contain|remediate|block|monitor|log|alert|ioc|indicator|yara|sigma|mitigation)\b/i],
  ["authorized_context", /\b(authorized|permission|owned|our environment|my lab|internal range|staging|engagement scope|rules of engagement|roe)\b/i],
  ["lab_context", /\b(lab|ctf|capture the flag|training range|sandbox|toy example|local vm)\b/i],
  ["validation_context", /\b(validate|validation|pentest|penetration test|red team|purple team|control test|security assessment)\b/i]
];

export function textLooksLikeArtifact(text: string): boolean {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const hasManyLogLines = lines.length >= 3 && lines.some((line) => /\d{4}-\d{2}-\d{2}|event id|src=|dst=|user=/i.test(line));
  const hasJsonShape = text.trim().startsWith("{") || text.trim().startsWith("[");
  return hasManyLogLines || hasJsonShape;
}

function matches(patterns: Array<[string, RegExp]>, text: string): string[] {
  return patterns.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

export function classifyCyberInput(input: { mode: AnalysisMode; text: string }): InputClassification {
  const text = input.text.trim();
  const harmfulSignals = matches(harmfulCapabilitySignals, text);
  const intentSignals = matches(requestIntentSignals, text);
  const matchedContextSignals = matches(contextSignals, text);
  const looksLikeArtifact = textLooksLikeArtifact(text);
  const hasUnscopedValidation =
    matchedContextSignals.includes("validation_context") &&
    !matchedContextSignals.includes("authorized_context") &&
    !matchedContextSignals.includes("lab_context");

  if (!text || harmfulSignals.length === 0) {
    if (hasUnscopedValidation && /\b(public company|public ip|target|domain|gain access|compromise)\b/i.test(text)) {
      return {
        category: "ambiguous",
        harmfulSignals,
        intentSignals,
        contextSignals: matchedContextSignals,
        looksLikeArtifact
      };
    }

    const category = matchedContextSignals.includes("lab_context")
      ? "lab"
      : matchedContextSignals.includes("authorized_context")
        ? "authorized_validation"
        : "defensive";
    return {
      category,
      harmfulSignals,
      intentSignals,
      contextSignals: matchedContextSignals,
      looksLikeArtifact
    };
  }

  if (looksLikeArtifact && input.mode !== "hardening") {
    return {
      category: "defensive",
      harmfulSignals,
      intentSignals,
      contextSignals: ["artifact_evidence", ...matchedContextSignals],
      looksLikeArtifact
    };
  }

  if (hasUnscopedValidation) {
    return {
      category: "ambiguous",
      harmfulSignals,
      intentSignals,
      contextSignals: matchedContextSignals,
      looksLikeArtifact
    };
  }

  if (matchedContextSignals.includes("lab_context")) {
    return {
      category: "lab",
      harmfulSignals,
      intentSignals,
      contextSignals: matchedContextSignals,
      looksLikeArtifact
    };
  }

  if (matchedContextSignals.includes("authorized_context") && matchedContextSignals.includes("validation_context")) {
    return {
      category: "authorized_validation",
      harmfulSignals,
      intentSignals,
      contextSignals: matchedContextSignals,
      looksLikeArtifact
    };
  }

  if (intentSignals.length > 0 && !matchedContextSignals.includes("defensive_context")) {
    return {
      category: "blocked",
      harmfulSignals,
      intentSignals,
      contextSignals: matchedContextSignals,
      looksLikeArtifact
    };
  }

  const explicitCompromise = /\b(break into|compromise|gain access|steal credentials|deploy ransomware|write malware|make a phishing kit)\b/i;
  if (explicitCompromise.test(text)) {
    return {
      category: "blocked",
      harmfulSignals,
      intentSignals: [...intentSignals, "explicit_compromise"],
      contextSignals: matchedContextSignals,
      looksLikeArtifact
    };
  }

  return {
    category: "defensive",
    harmfulSignals,
    intentSignals,
    contextSignals: matchedContextSignals,
    looksLikeArtifact
  };
}
