import { defensiveAnalysisPromptVersion, defensiveAnalysisSystemPrompt } from "./defensive-analysis.prompt";
import { promptVersionRecordSchema, type PromptVersionRecord } from "./prompt-version.schema";
import { sha256Text } from "../reasoning/hash";

const promptVersions: PromptVersionRecord[] = [
  promptVersionRecordSchema.parse({
    id: defensiveAnalysisPromptVersion,
    taskType: "defensive-analysis",
    version: defensiveAnalysisPromptVersion,
    schemaName: "defensive-analysis-provider",
    promptHash: sha256Text(defensiveAnalysisSystemPrompt),
    owner: "security-engineering",
    minEvalScore: 0.8,
    changeSummary: "Initial defensive analysis prompt with evidence-grounding and safety boundaries.",
    createdAt: "2026-04-17T00:00:00.000Z"
  })
];

export function listPromptVersions(): PromptVersionRecord[] {
  return promptVersions;
}

export function getPromptVersion(version: string): PromptVersionRecord | undefined {
  return promptVersions.find((record) => record.version === version || record.id === version);
}
