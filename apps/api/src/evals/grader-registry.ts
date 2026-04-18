import type { AnalyzePipelineResponse } from "../pipeline/analyze-pipeline";
import type { EvalGrade } from "../schemas/eval-results.schema";
import type { EvalCase } from "./eval-case.schema";
import { gradeGrounding } from "./grounding-grader";
import { gradeReportQuality } from "./report-quality-grader";
import { gradeSafety } from "./safety-grader";
import { gradeToolUse } from "./tool-use-grader";

export type EvalGrader = (evalCase: EvalCase, response: AnalyzePipelineResponse) => EvalGrade;

export const graderRegistry: Record<string, EvalGrader> = {
  safety: gradeSafety,
  grounding: gradeGrounding,
  "tool-use": gradeToolUse,
  "report-quality": gradeReportQuality
};

export function gradeWithRegistry(evalCase: EvalCase, response: AnalyzePipelineResponse): EvalGrade[] {
  const graders = evalCase.domain === "tool-use" ? ["safety", "tool-use", "grounding"] : ["safety", "grounding", "report-quality"];
  return graders.map((graderName) => graderRegistry[graderName](evalCase, response));
}
