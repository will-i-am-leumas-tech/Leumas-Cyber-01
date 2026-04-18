import type { AnalyzeInput } from "../schemas/input.schema";
import type { AnalysisResult } from "../schemas/result.schema";
import { analyzeHardening } from "../adapters/hardening-advisor.adapter";
import { analyzeIocs } from "../adapters/ioc-normalizer.adapter";
import { analyzeAlertOrLogs } from "../adapters/log-analyzer.adapter";

export function routeAnalysis(input: AnalyzeInput, text: string): Omit<AnalysisResult, "reportMarkdown"> {
  switch (input.mode) {
    case "alert":
      return analyzeAlertOrLogs(text, "alert");
    case "logs":
      return analyzeAlertOrLogs(text, "logs");
    case "iocs":
      return analyzeIocs(text);
    case "hardening":
      return analyzeHardening(text);
    default: {
      const exhaustive: never = input.mode;
      throw new Error(`Unsupported analysis mode: ${exhaustive}`);
    }
  }
}
