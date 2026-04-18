import { z } from "zod";
import { uploadedInputFileSchema } from "./ingest.schema";
import { redactionModeSchema } from "./privacy.schema";

export const analysisModeSchema = z.enum(["alert", "logs", "iocs", "hardening"]);

export const analyzeInputSchema = z
  .object({
    mode: analysisModeSchema,
    title: z.string().min(1).max(160).optional(),
    text: z.string().optional(),
    json: z.unknown().optional(),
    filename: z.string().max(260).optional(),
    files: z.array(uploadedInputFileSchema).optional(),
    useKnowledge: z.boolean().optional(),
    redactionMode: redactionModeSchema.default("redact"),
    knowledgeFilters: z
      .object({
        sourceIds: z.array(z.string()).optional(),
        trustTiers: z.array(z.enum(["internal", "standard", "vendor", "community"])).optional(),
        tenantId: z.string().optional(),
        approvalStates: z.array(z.enum(["draft", "approved", "rejected", "retired", "quarantined"])).optional()
      })
      .optional()
  })
  .refine((value) => value.text !== undefined || value.json !== undefined || (value.files?.length ?? 0) > 0, {
    message: "Either text, json, or uploaded files are required.",
    path: ["text"]
  });

export type AnalysisMode = z.infer<typeof analysisModeSchema>;
export type AnalyzeInput = z.infer<typeof analyzeInputSchema>;

export function inputToText(input: AnalyzeInput): string {
  const pieces: string[] = [];

  if (input.text?.trim()) {
    pieces.push(input.text.trim());
  }

  if (input.json !== undefined) {
    pieces.push(JSON.stringify(input.json, null, 2));
  }

  if (input.files) {
    for (const file of input.files) {
      pieces.push(file.text.trim());
    }
  }

  return pieces.join("\n\n").trim();
}

export function inferInputType(input: AnalyzeInput): string {
  if (input.files && input.files.length > 1) {
    return `uploaded:${input.files.length}-files`;
  }

  if (input.files && input.files.length === 1) {
    return `uploaded:${input.files[0].filename}`;
  }

  if (input.filename) {
    return `uploaded:${input.filename}`;
  }

  if (input.json !== undefined && input.text === undefined) {
    return "pasted-json";
  }

  return "pasted-text";
}
