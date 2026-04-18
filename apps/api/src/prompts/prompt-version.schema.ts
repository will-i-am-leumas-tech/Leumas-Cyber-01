import { z } from "zod";

export const promptVersionRecordSchema = z.object({
  id: z.string(),
  taskType: z.string(),
  version: z.string(),
  schemaName: z.string(),
  promptHash: z.string(),
  owner: z.string(),
  minEvalScore: z.number().min(0).max(1),
  changeSummary: z.string(),
  createdAt: z.string()
});

export type PromptVersionRecord = z.infer<typeof promptVersionRecordSchema>;
