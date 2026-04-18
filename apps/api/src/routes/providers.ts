import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { CyberModelProvider } from "../providers/base-provider";
import { defensiveSystemPrompt } from "../providers/base-provider";
import { getModelProfiles } from "../models/model-profile-registry";
import { checkProviderHealth } from "../providers/provider-health";
import { runProviderComparison } from "../providers/provider-comparison-runner";
import { decideProviderFallback } from "../providers/provider-fallback-policy";
import { getProviderRegistry } from "../providers/provider-registry";
import { selectProviderForTask } from "../providers/provider-router";
import { validateProviderStructuredOutput } from "../providers/structured-output";
import type { UsageAccountingService } from "../providers/usage-accounting";
import { buildProviderCall } from "../providers/usage-accounting";
import { MockProvider } from "../providers/mock-provider";
import { buildCaseFlowMetrics } from "../collaboration/case-queue-service";
import { loadEvalCases } from "../evals/eval-runner";
import { defensiveAnalysisPromptVersion } from "../prompts/defensive-analysis.prompt";
import { listPromptVersions } from "../prompts/prompt-registry";
import type { CaseService } from "../services/case-service";
import { nowIso } from "../utils/time";

interface ProviderRouteDeps {
  caseService: CaseService;
  provider: CyberModelProvider;
  usageAccountingService: UsageAccountingService;
}

const providerTestSchema = z
  .object({
    taskType: z.enum(["alert", "logs", "iocs", "hardening", "report", "eval", "safety"]).default("alert")
  })
  .default({});

const providerComparisonRequestSchema = z
  .object({
    evalDir: z.string().default("data/evals"),
    includeMockBaseline: z.boolean().default(true)
  })
  .default({});

export function registerProviderRoutes(app: FastifyInstance, deps: ProviderRouteDeps): void {
  app.get("/providers", async () => {
    const providers = getProviderRegistry(deps.provider);
    const health = providers.map((provider) => checkProviderHealth(provider, deps.provider));
    return {
      activeProvider: deps.provider.name,
      selectedForAlert: selectProviderForTask(providers, "alert"),
      fallbackForAlert: decideProviderFallback({
        configs: providers,
        taskType: "alert",
        activeProviderId: deps.provider.name,
        health
      }),
      providers
    };
  });

  app.get("/providers/profiles", async () => ({
    activeProvider: deps.provider.name,
    profiles: getModelProfiles(deps.provider),
    promptVersions: listPromptVersions()
  }));

  app.get("/providers/health", async () => {
    const providers = getProviderRegistry(deps.provider);
    return {
      providers: providers.map((provider) => checkProviderHealth(provider, deps.provider))
    };
  });

  app.get("/providers/usage", async () => ({
    records: deps.usageAccountingService.list(),
    summary: deps.usageAccountingService.summarize()
  }));

  app.get("/admin/dashboards/model-quality", async () => {
    const providers = getProviderRegistry(deps.provider);
    const health = providers.map((provider) => checkProviderHealth(provider, deps.provider));
    const usage = deps.usageAccountingService.summarize();
    const cases = await deps.caseService.listFullCases();
    const groundingFindings = cases.flatMap((cyberCase) => cyberCase.groundingFindings);
    const metrics = [
      ...buildCaseFlowMetrics(cases),
      {
        name: "provider_calls_total",
        value: usage.reduce((sum, item) => sum + item.calls, 0),
        labels: {},
        window: "current"
      },
      {
        name: "provider_failures_total",
        value: usage.reduce((sum, item) => sum + item.failures, 0),
        labels: {},
        window: "current"
      },
      {
        name: "grounding_findings_total",
        value: groundingFindings.length,
        labels: {},
        window: "current"
      },
      {
        name: "grounding_findings_weak",
        value: groundingFindings.filter((finding) => finding.status !== "supported").length,
        labels: {},
        window: "current"
      }
    ];

    return {
      activeProvider: deps.provider.name,
      providers: health,
      usage,
      metrics,
      profiles: getModelProfiles(deps.provider),
      promptVersions: listPromptVersions()
    };
  });

  app.get("/providers/comparisons", async () => ({
    comparisons: [],
    message: "Run POST /providers/comparisons to compare configured providers against the eval suite."
  }));

  app.post("/providers/comparisons", async (request) => {
    const body = providerComparisonRequestSchema.parse(request.body ?? {});
    const evalCases = await loadEvalCases(body.evalDir);
    const providers =
      body.includeMockBaseline && deps.provider.name !== "local-mock" ? [new MockProvider(), deps.provider] : [deps.provider];

    return {
      comparison: await runProviderComparison({
        evalCases,
        providers
      })
    };
  });

  app.post("/providers/test", async (request) => {
    const body = providerTestSchema.parse(request.body ?? {});
    const providers = getProviderRegistry(deps.provider);
    const selectedProvider = selectProviderForTask(providers, body.taskType);
    const userPrompt = "Run a safe provider readiness check for defensive cyber analysis. Do not include sensitive data.";
    const startedAt = nowIso();
    const result = await deps.provider.analyze({
      systemPrompt: defensiveSystemPrompt,
      userPrompt,
      context: {
        mode: body.taskType,
        readinessCheck: true
      }
    });
    const completedAt = nowIso();
    const outputText = [result.text, JSON.stringify(result.structured ?? {})].join("\n");
    const providerCall = buildProviderCall({
      caseId: "provider_readiness",
      provider: deps.provider.name,
      model: deps.provider.model ?? deps.provider.name,
      promptVersion: defensiveAnalysisPromptVersion,
      taskType: body.taskType,
      status: "completed",
      systemPrompt: defensiveSystemPrompt,
      userPrompt,
      outputText,
      startedAt,
      completedAt
    });
    const structuredOutputValidation = validateProviderStructuredOutput({
      providerCallId: providerCall.id,
      schemaName: "provider-readiness",
      output: result.structured
    });
    const usageRecord = deps.usageAccountingService.record(providerCall);

    return {
      selectedProvider,
      providerCall,
      structuredOutputValidation,
      usageRecord
    };
  });
}
