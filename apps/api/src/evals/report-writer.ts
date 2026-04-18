import { writeJsonFile } from "../utils/files";
import { evalRunSchema, type EvalRun } from "./eval-case.schema";
import { evalRunV2Schema, type EvalRunV2, providerComparisonRunSchema, type ProviderComparisonRun } from "../schemas/eval-results.schema";

export async function writeEvalReport(run: EvalRun, outputPath: string): Promise<void> {
  await writeJsonFile(outputPath, evalRunSchema.parse(run));
}

export async function writeEvalReportV2(run: EvalRunV2, outputPath: string): Promise<void> {
  await writeJsonFile(outputPath, evalRunV2Schema.parse(run));
}

export async function writeProviderComparisonReport(run: ProviderComparisonRun, outputPath: string): Promise<void> {
  await writeJsonFile(outputPath, providerComparisonRunSchema.parse(run));
}
