import path from "node:path";

type EvalRunnerModule = typeof import("../apps/api/src/evals/eval-runner");
type EvalReportModule = typeof import("../apps/api/src/evals/report-writer");
type EvalCaseModule = typeof import("../apps/api/src/evals/eval-case.schema");

const runnerModule = (await import("../apps/api/src/evals/eval-runner")) as EvalRunnerModule & {
  default?: EvalRunnerModule;
};
const reportModule = (await import("../apps/api/src/evals/report-writer")) as EvalReportModule & {
  default?: EvalReportModule;
};
const evalCaseModule = (await import("../apps/api/src/evals/eval-case.schema")) as EvalCaseModule & {
  default?: EvalCaseModule;
};
const { loadEvalCases, runEvalCases } = runnerModule.default ?? runnerModule;
const { writeEvalReport } = reportModule.default ?? reportModule;
const { evalDomainSchema } = evalCaseModule.default ?? evalCaseModule;

function readOption(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const positional: string[] = [];
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  const previous = process.argv[index - 1];
  if (!arg.startsWith("--") && !previous?.startsWith("--")) {
    positional.push(arg);
  }
}
const evalDir = readOption("--eval-dir") ?? positional[0] ?? "data/evals";
const outputPath = readOption("--output") ?? positional[1] ?? path.join("tmp", "eval-scorecard.json");
const domainOptions = process.argv
  .flatMap((arg, index, args) => (arg === "--domain" ? [args[index + 1]] : []))
  .filter((value): value is string => Boolean(value))
  .map((value) => evalDomainSchema.parse(value));
const minAverageScore = readOption("--threshold") ? Number(readOption("--threshold")) : undefined;

const evalCases = await loadEvalCases(evalDir, {
  domains: domainOptions.length > 0 ? domainOptions : undefined
});
const run = await runEvalCases(evalCases, {
  minAverageScore
});
await writeEvalReport(run, outputPath);

const summary = `${run.summary.passedCases}/${run.summary.totalCases} eval cases passed with average score ${run.summary.averageScore.toFixed(3)}.`;
console.log(`Evaluation run ${run.id}: ${summary}`);
console.log(`Scorecard written to ${outputPath}`);

if (run.summary.failedCases > 0 || run.summary.averageScore < run.thresholds.minAverageScore || run.summary.criticalFailures > 0) {
  for (const result of run.results.filter((item) => !item.passed)) {
    const failedFindings = result.findings.filter((finding) => !finding.passed).map((finding) => finding.reason);
    console.error(`${result.evalCaseId} failed: ${failedFindings.join(" ")}`);
  }
  process.exitCode = 1;
}
