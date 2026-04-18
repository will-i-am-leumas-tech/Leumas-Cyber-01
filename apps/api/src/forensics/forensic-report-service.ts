import type {
  FileTriageSummary,
  ForensicCollectionTask,
  SandboxBehavior,
  YaraMatchExplanation
} from "../schemas/malware-forensics.schema";

export function summarizeForensicFindings(input: {
  triage: FileTriageSummary[];
  sandbox: SandboxBehavior[];
  yara: YaraMatchExplanation[];
  tasks: ForensicCollectionTask[];
}): string {
  return [
    `File triage records: ${input.triage.length}.`,
    `Sandbox behavior reports: ${input.sandbox.length}.`,
    `YARA explanations: ${input.yara.length}.`,
    `Open collection tasks: ${input.tasks.filter((task) => task.status === "open").length}.`,
    "Use observed behavior, IOCs, and collection gaps for containment and remediation planning."
  ].join(" ");
}
