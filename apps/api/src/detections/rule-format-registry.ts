import type { DetectionRuleFormat } from "../schemas/detections-v2.schema";

export interface RuleFormatDefinition {
  id: DetectionRuleFormat;
  name: string;
  targetBackends: string[];
  supportsValidation: boolean;
  supportsCorpusTests: boolean;
  notes: string;
}

const ruleFormats: RuleFormatDefinition[] = [
  {
    id: "sigma-like-json",
    name: "Sigma-like JSON",
    targetBackends: ["portable-fixture-runner"],
    supportsValidation: true,
    supportsCorpusTests: true,
    notes: "Internal structured rule used for deterministic testing."
  },
  {
    id: "kql",
    name: "Kusto Query Language",
    targetBackends: ["microsoft-sentinel", "microsoft-defender-xdr"],
    supportsValidation: true,
    supportsCorpusTests: false,
    notes: "Text query export for Microsoft security analytics backends."
  },
  {
    id: "spl",
    name: "Splunk SPL",
    targetBackends: ["splunk-enterprise-security"],
    supportsValidation: true,
    supportsCorpusTests: false,
    notes: "Text query export for Splunk search and correlation workflows."
  },
  {
    id: "yara",
    name: "YARA",
    targetBackends: ["file-scanning", "memory-scanning"],
    supportsValidation: true,
    supportsCorpusTests: false,
    notes: "Defensive static signature format. This project stores only detection strings and metadata."
  }
];

export function listRuleFormats(): RuleFormatDefinition[] {
  return [...ruleFormats];
}

export function getRuleFormat(format: DetectionRuleFormat): RuleFormatDefinition | null {
  return ruleFormats.find((candidate) => candidate.id === format) ?? null;
}
