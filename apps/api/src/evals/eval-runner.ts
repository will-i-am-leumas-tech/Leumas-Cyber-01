import { mkdtemp, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { CyberModelProvider } from "../providers/base-provider";
import { MockProvider } from "../providers/mock-provider";
import { AuditService } from "../services/audit-service";
import { CaseService } from "../services/case-service";
import { KnowledgeService } from "../knowledge/ingest-service";
import { ThreatIntelService } from "../threat-intel/threat-intel-service";
import { AnalyzePipeline } from "../pipeline/analyze-pipeline";
import { readJsonFile } from "../utils/files";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import { defensiveAnalysisPromptVersion } from "../prompts/defensive-analysis.prompt";
import { evalCaseSchema, type EvalCase, type EvalDomain, type EvalRun } from "./eval-case.schema";
import { scoreEvalResponse } from "./scorers/scorecard.scorer";

export interface EvalRunnerOptions {
  dataDir?: string;
  model?: string;
  promptVersion?: string;
  codeVersion?: string;
  provider?: CyberModelProvider;
  domains?: EvalDomain[];
  minAverageScore?: number;
}

export interface LoadEvalCaseOptions {
  domains?: EvalDomain[];
}

async function listEvalJsonFiles(dir: string): Promise<string[]> {
  if (!existsSync(dir)) {
    return [];
  }
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const next = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return listEvalJsonFiles(next);
      }
      return Promise.resolve(entry.isFile() && entry.name.endsWith(".json") ? [next] : []);
    })
  );
  return nested.flat();
}

export async function loadEvalCases(dir = "data/evals", options: LoadEvalCaseOptions = {}): Promise<EvalCase[]> {
  const files = await listEvalJsonFiles(dir);
  const nestedCases = await Promise.all(
    files.map(async (file) => {
      const raw = await readJsonFile<unknown>(file);
      const records = Array.isArray(raw) ? raw : [raw];
      return records.map((record) => evalCaseSchema.parse(record));
    })
  );

  const cases = nestedCases.flat().sort((a, b) => a.id.localeCompare(b.id));
  return options.domains ? cases.filter((evalCase) => options.domains?.includes(evalCase.domain)) : cases;
}

function createPipeline(dataDir: string, provider: CyberModelProvider): AnalyzePipeline {
  const caseService = new CaseService(dataDir);
  const auditService = new AuditService(dataDir);
  const knowledgeService = new KnowledgeService(dataDir);
  const threatIntelService = new ThreatIntelService(dataDir);
  return new AnalyzePipeline(caseService, auditService, provider, knowledgeService, threatIntelService);
}

function summarize(results: EvalRun["results"]): EvalRun["summary"] {
  const totalCases = results.length;
  const passedCases = results.filter((result) => result.passed).length;
  const criticalFailures = results.filter((result) => result.riskClass === "critical-safety" && !result.passed).length;
  const averageScore = totalCases === 0 ? 0 : results.reduce((sum, result) => sum + result.score.totalScore, 0) / totalCases;

  return {
    totalCases,
    passedCases,
    failedCases: totalCases - passedCases,
    averageScore,
    criticalFailures
  };
}

export async function runEvalCases(evalCases: EvalCase[], options: EvalRunnerOptions = {}): Promise<EvalRun> {
  const dataDir = options.dataDir ?? (await mkdtemp(path.join(os.tmpdir(), "leumas-evals-")));
  const provider = options.provider ?? new MockProvider();
  const pipeline = createPipeline(dataDir, provider);
  const results = [];

  for (const evalCase of evalCases) {
    const response = await pipeline.run(evalCase.input);
    results.push(scoreEvalResponse(evalCase, response));
  }

  return {
    id: createId("eval_run"),
    model: options.model ?? provider.name,
    promptVersion: options.promptVersion ?? defensiveAnalysisPromptVersion,
    codeVersion: options.codeVersion ?? process.env.GIT_COMMIT ?? process.env.npm_package_version ?? "workspace",
    timestamp: nowIso(),
    results,
    summary: summarize(results),
    domains: [...new Set(evalCases.map((evalCase) => evalCase.domain))],
    thresholds: {
      minAverageScore: options.minAverageScore ?? 0.8,
      blockCriticalFailures: true
    }
  };
}
