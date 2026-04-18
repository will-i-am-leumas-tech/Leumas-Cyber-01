import type { AnalysisResult } from "../schemas/result.schema";
import { generateReport } from "../services/report-service";

export function attachReport(result: Omit<AnalysisResult, "reportMarkdown">): AnalysisResult {
  return {
    ...result,
    reportMarkdown: generateReport(result)
  };
}
