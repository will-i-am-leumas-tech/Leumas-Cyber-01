import type { AuditEntry, CyberCase } from "../schemas/case.schema";
import type { AnalyzeInput } from "../schemas/input.schema";
import { analyzeInputSchema, inputToText } from "../schemas/input.schema";
import type { AnalysisResult, Refusal } from "../schemas/result.schema";
import type { Entity, NormalizedEvent, UploadedArtifact } from "../schemas/ingest.schema";
import type { Finding, Hypothesis, Observation, ReasoningRun } from "../schemas/reasoning.schema";
import { attachReport } from "../adapters/report-generator.adapter";
import { detectOffensiveRequest } from "../guardrails/offensive-detector";
import { buildRefusal } from "../guardrails/refusal-builder";
import type { CyberModelProvider } from "../providers/base-provider";
import { defensiveSystemPrompt } from "../providers/base-provider";
import { applyKnowledgeContext } from "../knowledge/citation-service";
import { KnowledgeService } from "../knowledge/ingest-service";
import { buildIngestionBundle, timelineFromNormalizedEvents } from "../ingest/event-normalizer";
import { buildDefensiveAnalysisUserPrompt, defensiveAnalysisPromptVersion } from "../prompts/defensive-analysis.prompt";
import { sha256Text } from "../reasoning/hash";
import { buildReasoningBundle } from "../reasoning/reasoning-service";
import type { OutputSafetyResult, PromptInjectionFinding, SafetyDecision } from "../schemas/safety.schema";
import { detectPromptInjection } from "../safety/prompt-injection-detector";
import { safetyDecisionMetadata, outputSafetyMetadata, promptInjectionMetadata } from "../safety/safety-audit-service";
import { validateOutputSafety } from "../safety/output-validator";
import { CaseService } from "../services/case-service";
import { AuditService } from "../services/audit-service";
import { ThreatIntelService } from "../threat-intel/threat-intel-service";
import type { IndicatorEnrichment, ThreatContextSummary, ThreatIntelSource } from "../schemas/threat-intel.schema";
import type {
  DataClassification,
  PrivacyAuditEvent,
  PromptPackage,
  RedactedArtifact,
  SensitiveFinding
} from "../schemas/privacy.schema";
import type { ProviderCall, StructuredOutputValidation, UsageRecord } from "../schemas/providers.schema";
import type { GroundingFinding } from "../schemas/model-quality.schema";
import type { CitationQuality } from "../schemas/knowledge-v2.schema";
import { buildRedactedArtifact, applyRedactions } from "../privacy/redaction-service";
import { minimizePromptInput } from "../privacy/prompt-minimizer";
import { classifySensitiveData, detectSensitiveData, summarizeSensitiveFindings } from "../privacy/sensitive-data-detector";
import type { MetricsService } from "../observability/metrics-service";
import { buildProviderCall, UsageAccountingService } from "../providers/usage-accounting";
import { validateProviderStructuredOutput } from "../providers/structured-output";
import { validateEvidenceGrounding } from "../reasoning/evidence-grounding-validator";
import { buildCyberReasoningV2 } from "../reasoning/cyber-reasoning-engine";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import { routeAnalysis } from "./pipeline-router";

export interface AnalyzePipelineResponse {
  allowed: boolean;
  caseId: string;
  case: CyberCase;
  result?: AnalysisResult;
  refusal?: Refusal;
  observations?: Observation[];
  hypotheses?: Hypothesis[];
  findings?: Finding[];
  artifacts?: UploadedArtifact[];
  normalizedEvents?: NormalizedEvent[];
  entities?: Entity[];
  safetyDecision?: SafetyDecision;
  promptInjectionFindings?: PromptInjectionFinding[];
  outputSafetyResults?: OutputSafetyResult[];
  indicatorEnrichments?: IndicatorEnrichment[];
  threatContextSummaries?: ThreatContextSummary[];
  sensitiveFindings?: SensitiveFinding[];
  redactedArtifacts?: RedactedArtifact[];
  promptPackages?: PromptPackage[];
  dataClassifications?: DataClassification[];
  privacyAuditEvents?: PrivacyAuditEvent[];
  providerCalls?: ProviderCall[];
  structuredOutputValidations?: StructuredOutputValidation[];
  usageRecords?: UsageRecord[];
  groundingFindings?: GroundingFinding[];
  knowledgeCitationQualities?: CitationQuality[];
  auditEntries: AuditEntry[];
}

export class AnalyzePipeline {
  constructor(
    private readonly caseService: CaseService,
    private readonly auditService: AuditService,
    private readonly provider: CyberModelProvider,
    private readonly knowledgeService?: KnowledgeService,
    private readonly threatIntelService?: ThreatIntelService,
    private readonly metricsService?: MetricsService,
    private readonly usageAccountingService?: UsageAccountingService
  ) {}

  async run(rawInput: AnalyzeInput): Promise<AnalyzePipelineResponse> {
    const input = analyzeInputSchema.parse(rawInput);
    const caseId = createId("case");
    const text = inputToText(input);
    const auditEntries: AuditEntry[] = [];
    const promptInjectionFindings: PromptInjectionFinding[] = [];
    const outputSafetyResults: OutputSafetyResult[] = [];
    const sensitiveFindings: SensitiveFinding[] = [];
    const redactedArtifacts: RedactedArtifact[] = [];
    const promptPackages: PromptPackage[] = [];
    const dataClassifications: DataClassification[] = [];
    const privacyAuditEvents: PrivacyAuditEvent[] = [];
    const providerCalls: ProviderCall[] = [];
    const structuredOutputValidations: StructuredOutputValidation[] = [];
    const usageRecords: UsageRecord[] = [];
    const groundingFindings: GroundingFinding[] = [];
    const knowledgeCitationQualities: CitationQuality[] = [];
    const rawInputRef = input.filename ? `upload:${input.filename}` : input.json !== undefined ? "inline-json" : "inline-text";
    this.metricsService?.increment("analysis_requests_total", { mode: input.mode });

    const record = async (entry: Omit<AuditEntry, "id" | "timestamp" | "caseId">): Promise<void> => {
      const saved = await this.auditService.record({
        caseId,
        ...entry
      });
      auditEntries.push(saved);
    };

    await record({
      action: "analysis.received",
      summary: `Received ${input.mode} input for defensive analysis.`,
      allowed: true,
      metadata: {
        mode: input.mode,
        inputType: rawInputRef,
        provider: this.provider.name
      }
    });

    sensitiveFindings.push(...detectSensitiveData(text, rawInputRef));
    const dataClass = classifySensitiveData(sensitiveFindings);
    dataClassifications.push({
      id: createId("data_classification"),
      resourceRef: rawInputRef,
      dataClass,
      reason:
        sensitiveFindings.length > 0
          ? `Detected sensitive data types: ${Object.keys(summarizeSensitiveFindings(sensitiveFindings)).join(", ")}.`
          : "No sensitive values matched the MVP privacy detector.",
      createdAt: nowIso()
    });
    privacyAuditEvents.push({
      id: createId("privacy_audit"),
      caseId,
      action: sensitiveFindings.length > 0 ? "privacy.sensitive_data_detected" : "privacy.scan_clean",
      dataClass,
      findingCount: sensitiveFindings.length,
      summary:
        sensitiveFindings.length > 0
          ? `Detected and prepared redaction for ${sensitiveFindings.length} sensitive value${sensitiveFindings.length === 1 ? "" : "s"}.`
          : "Privacy scan found no sensitive values.",
      timestamp: nowIso()
    });
    if (sensitiveFindings.length > 0) {
      redactedArtifacts.push(
        buildRedactedArtifact({
          originalRef: rawInputRef,
          text,
          findings: sensitiveFindings
        })
      );
      await record({
        action: "privacy.sensitive_data_detected",
        summary: `Detected ${sensitiveFindings.length} sensitive value${sensitiveFindings.length === 1 ? "" : "s"} and prepared provider redaction.`,
        allowed: true,
        metadata: {
          findingTypes: summarizeSensitiveFindings(sensitiveFindings),
          dataClass,
          sourceRef: rawInputRef
        }
      });
    }

    const safety = detectOffensiveRequest({ mode: input.mode, text });
    if (!safety.allowed) {
      this.metricsService?.increment("analysis_refusals_total", { reason: safety.reason });
      await record({
        action: "guardrail.blocked",
        summary: "Blocked offensive request before provider execution.",
        allowed: false,
        metadata: safetyDecisionMetadata(safety)
      });

      const refusal = buildRefusal(safety);
      const cyberCase = this.caseService.buildCase(input, {
        id: caseId,
        rawInputRef,
        refusal,
        auditEntries
      });
      cyberCase.safetyDecisions.push(safety);
      cyberCase.sensitiveFindings.push(...sensitiveFindings);
      cyberCase.redactedArtifacts.push(...redactedArtifacts);
      cyberCase.dataClassifications.push(...dataClassifications);
      cyberCase.privacyAuditEvents.push(...privacyAuditEvents);
      await this.caseService.saveCase(cyberCase);

      return {
        allowed: false,
        caseId,
        case: cyberCase,
        refusal,
        safetyDecision: safety,
        sensitiveFindings,
        redactedArtifacts,
        dataClassifications,
        privacyAuditEvents,
        providerCalls,
        structuredOutputValidations,
        usageRecords,
        groundingFindings,
        knowledgeCitationQualities,
        auditEntries
      };
    }

    await record({
      action: "guardrail.allowed",
      summary: `Request passed safety policy as ${safety.category}.`,
      allowed: true,
      metadata: safetyDecisionMetadata(safety)
    });

    promptInjectionFindings.push(...detectPromptInjection(text, rawInputRef));
    if (promptInjectionFindings.length > 0) {
      await record({
        action: "safety.prompt_injection_detected",
        summary: `Flagged ${promptInjectionFindings.length} prompt-injection pattern${promptInjectionFindings.length === 1 ? "" : "s"} in submitted evidence.`,
        allowed: true,
        metadata: promptInjectionMetadata(promptInjectionFindings)
      });
    }

    const ingestion = buildIngestionBundle(input);
    const normalizedTimeline = timelineFromNormalizedEvents(ingestion.normalizedEvents);
    const baseAdapterResult = routeAnalysis(input, text);
    const timelineKeys = new Set(baseAdapterResult.timeline.map((event) => `${event.timestamp}:${event.raw ?? event.label}`));
    const mergedTimeline = [
      ...baseAdapterResult.timeline,
      ...normalizedTimeline.filter((event) => !timelineKeys.has(`${event.timestamp}:${event.raw ?? event.label}`))
    ].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const parserNotes =
      ingestion.parserWarnings.length > 0 && ingestion.normalizedEvents.length > 0
        ? [`Parser warnings: ${ingestion.parserWarnings.length} non-blocking warning${ingestion.parserWarnings.length === 1 ? "" : "s"}.`]
        : [];
    const adapterResult = {
      ...baseAdapterResult,
      timeline: mergedTimeline,
      ingestion,
      notes: [...baseAdapterResult.notes, ...parserNotes]
    };

    await record({
      action: "ingest.normalized",
      summary: `Normalized ${ingestion.normalizedEvents.length} event${ingestion.normalizedEvents.length === 1 ? "" : "s"} from ${ingestion.artifacts.length} artifact${ingestion.artifacts.length === 1 ? "" : "s"}.`,
      allowed: true,
      metadata: {
        artifactCount: ingestion.artifacts.length,
        eventCount: ingestion.normalizedEvents.length,
        entityCount: ingestion.entities.length,
        parserWarningCount: ingestion.parserWarnings.length
      }
    });

    const knowledgeQuery = [input.mode, adapterResult.title, adapterResult.summary, text].join("\n");
    const knowledge =
      input.useKnowledge === false || !this.knowledgeService
        ? undefined
        : await this.knowledgeService.buildKnowledgeContext({
            caseId,
            query: {
              query: knowledgeQuery,
              task: input.mode,
              limit: 3,
              filters: input.knowledgeFilters
            },
            promptIncluded: true
          });
    const enrichedAdapterResult = applyKnowledgeContext(adapterResult, knowledge);
    knowledgeCitationQualities.push(
      ...(knowledge?.results.flatMap((result) =>
        result.citationQuality ? [result.citationQuality as CitationQuality] : []
      ) ?? [])
    );
    const notes = [...enrichedAdapterResult.notes];
    const reasoningRuns: ReasoningRun[] = [];

    if (knowledge) {
      await record({
        action: "knowledge.retrieved",
        summary: `Retrieved ${knowledge.results.length} knowledge source chunk${knowledge.results.length === 1 ? "" : "s"}.`,
        allowed: true,
        metadata: {
          queryHash: sha256Text(knowledge.query),
          resultChunkIds: knowledge.results.map((result) => result.chunkId),
          snapshotIds: knowledge.snapshots.map((snapshot) => snapshot.id),
          citationQualityIds: knowledgeCitationQualities.map((quality) => quality.citationId),
          warnings: knowledge.warnings
        }
      });
    }

    try {
      const adapterSummary = [
        enrichedAdapterResult.summary,
        knowledge
          ? `Knowledge context:\n${knowledge.results
              .map((result) => `- ${result.citation.title} ${result.citation.location}: ${result.excerpt}`)
              .join("\n")}`
          : "Knowledge context: none retrieved."
      ].join("\n\n");
      const promptMinimization = minimizePromptInput({
        caseId,
        provider: this.provider.name,
        text,
        findings: sensitiveFindings,
        mode: input.redactionMode
      });
      promptPackages.push(promptMinimization.packageRecord);
      const providerAdapterSummary =
        input.redactionMode === "redact" ? applyRedactions(adapterSummary, sensitiveFindings) : adapterSummary;
      const userPrompt = buildDefensiveAnalysisUserPrompt({
        mode: input.mode,
        text: promptMinimization.promptText,
        adapterSummary: providerAdapterSummary
      });
      const startedAt = nowIso();
      const providerResult = await this.provider.analyze({
        systemPrompt: defensiveSystemPrompt,
        userPrompt,
        context: {
          mode: input.mode,
          adapterCategory: enrichedAdapterResult.category
        }
      });
      const completedAt = nowIso();
      const outputText = [providerResult.text, JSON.stringify(providerResult.structured ?? {})].join("\n");
      const outputSafety = validateOutputSafety(outputText);
      outputSafetyResults.push(outputSafety);
      const providerCall = buildProviderCall({
        caseId,
        provider: this.provider.name,
        model: this.provider.model ?? this.provider.name,
        promptVersion: defensiveAnalysisPromptVersion,
        taskType: input.mode,
        status: outputSafety.allowed ? "completed" : "blocked",
        systemPrompt: defensiveSystemPrompt,
        userPrompt,
        outputText,
        startedAt,
        completedAt
      });
      providerCalls.push(providerCall);
      usageRecords.push(this.usageAccountingService?.record(providerCall) ?? {
        id: createId("usage"),
        caseId,
        provider: providerCall.provider,
        model: providerCall.model,
        promptVersion: providerCall.promptVersion,
        taskType: providerCall.taskType,
        status: providerCall.status,
        totalTokens: providerCall.tokens.totalTokens,
        latencyMs: providerCall.latencyMs,
        createdAt: providerCall.completedAt
      });
      structuredOutputValidations.push(
        validateProviderStructuredOutput({
          providerCallId: providerCall.id,
          schemaName: "defensive-analysis-provider",
          output: providerResult.structured
        })
      );

      reasoningRuns.push({
        id: "reasoning_run_001",
        provider: this.provider.name,
        model: this.provider.name,
        promptVersion: defensiveAnalysisPromptVersion,
        inputHash: sha256Text(`${defensiveSystemPrompt}\n${userPrompt}`),
        outputHash: sha256Text(outputText),
        validationStatus: outputSafety.allowed ? "passed" : "blocked",
        validationSummary: outputSafety.allowed
          ? "Provider output passed defensive safety validation."
          : `Provider output was withheld by safety validation: ${outputSafety.blockedSegments.join(", ")}.`,
        startedAt,
        completedAt
      });

      if (outputSafety.allowed) {
        notes.push(`Model provider ${this.provider.name} completed: ${providerResult.text}`);
        await record({
          action: "provider.completed",
          summary: `Provider ${this.provider.name} completed defensive review.`,
          allowed: true,
          metadata: {
            provider: this.provider.name,
            providerCallId: providerCall.id,
            structured: providerResult.structured,
            structuredOutputValidation: structuredOutputValidations.at(-1),
            promptVersion: defensiveAnalysisPromptVersion,
            outputSafety: outputSafetyMetadata(outputSafety)
          }
        });
      } else {
        notes.push(`Model provider ${this.provider.name} output was withheld by safety validation.`);
        await record({
          action: "provider.output_blocked",
          summary: "Provider output was blocked before final response composition.",
          allowed: false,
          metadata: {
            provider: this.provider.name,
            providerCallId: providerCall.id,
            outputSafety: outputSafetyMetadata(outputSafety),
            promptVersion: defensiveAnalysisPromptVersion
          }
        });
      }
    } catch (error) {
      this.metricsService?.increment("provider_failures_total", { provider: this.provider.name });
      const timestamp = nowIso();
      const errorSummary = error instanceof Error ? error.message : "Provider failed.";
      const failedProviderCall = buildProviderCall({
        caseId,
        provider: this.provider.name,
        model: this.provider.model ?? this.provider.name,
        promptVersion: defensiveAnalysisPromptVersion,
        taskType: input.mode,
        status: "failed",
        systemPrompt: defensiveSystemPrompt,
        userPrompt: text,
        outputText: "",
        startedAt: timestamp,
        completedAt: timestamp,
        errorSummary
      });
      providerCalls.push(failedProviderCall);
      usageRecords.push(this.usageAccountingService?.record(failedProviderCall) ?? {
        id: createId("usage"),
        caseId,
        provider: failedProviderCall.provider,
        model: failedProviderCall.model,
        promptVersion: failedProviderCall.promptVersion,
        taskType: failedProviderCall.taskType,
        status: failedProviderCall.status,
        totalTokens: failedProviderCall.tokens.totalTokens,
        latencyMs: failedProviderCall.latencyMs,
        createdAt: failedProviderCall.completedAt
      });
      structuredOutputValidations.push(
        validateProviderStructuredOutput({
          providerCallId: failedProviderCall.id,
          schemaName: "defensive-analysis-provider"
        })
      );
      reasoningRuns.push({
        id: "reasoning_run_001",
        provider: this.provider.name,
        model: this.provider.name,
        promptVersion: defensiveAnalysisPromptVersion,
        inputHash: sha256Text(`${defensiveSystemPrompt}\n${text}`),
        validationStatus: "failed",
        validationSummary: "Provider failed; deterministic local adapters produced the result.",
        startedAt: timestamp,
        completedAt: timestamp
      });
      notes.push(`Model provider ${this.provider.name} was unavailable; deterministic local adapters produced this result.`);
      await record({
        action: "provider.failed",
        summary: errorSummary,
        allowed: true,
        metadata: {
          provider: this.provider.name,
          providerCallId: failedProviderCall.id
        }
      });
    }

    const reasoning = buildReasoningBundle(
      {
        ...enrichedAdapterResult,
        notes
      },
      reasoningRuns
    );

    const result = attachReport({
      ...enrichedAdapterResult,
      reasoning,
      notes
    });
    const reasoningV2 = buildCyberReasoningV2({ result, reasoning });
    groundingFindings.push(...validateEvidenceGrounding({ caseId, result }));
    const groundingSummary = {
      supported: groundingFindings.filter((finding) => finding.status === "supported").length,
      weak: groundingFindings.filter((finding) => finding.status === "weak").length,
      unsupported: groundingFindings.filter((finding) => finding.status === "unsupported").length,
      analystReviewRequired: groundingFindings.filter((finding) => finding.analystReviewRequired).length
    };
    await record({
      action: "model.grounding_validated",
      summary: `Validated ${groundingFindings.length} model-facing claim${groundingFindings.length === 1 ? "" : "s"} against case evidence.`,
      allowed: groundingSummary.unsupported === 0,
      metadata: groundingSummary
    });

    let threatIntel:
      | {
          threatIntelSources: ThreatIntelSource[];
          indicatorEnrichments: IndicatorEnrichment[];
          threatContextSummaries: ThreatContextSummary[];
        }
      | undefined;

    if (this.threatIntelService && result.indicators.length > 0) {
      const enriched = await this.threatIntelService.enrichIndicators(result.indicators, caseId);
      threatIntel = {
        threatIntelSources: enriched.threatIntelSources,
        indicatorEnrichments: enriched.indicatorEnrichments,
        threatContextSummaries: enriched.threatContextSummaries
      };
      await record({
        action: "threat_intel.enriched",
        summary: `Enriched ${result.indicators.length} indicator${result.indicators.length === 1 ? "" : "s"} with local threat intelligence.`,
        allowed: true,
        metadata: {
          enrichmentCount: enriched.indicatorEnrichments.length,
          summaryCount: enriched.threatContextSummaries.length
        }
      });
    }

    await record({
      action: "reasoning.validated",
      summary: `Validated ${reasoning.observations.length} observations, ${reasoning.hypotheses.length} hypotheses, and ${reasoning.findings.length} findings.`,
      allowed: true,
      metadata: {
        observations: reasoning.observations.length,
        hypotheses: reasoning.hypotheses.length,
        findings: reasoning.findings.length,
        promptVersion: defensiveAnalysisPromptVersion
      }
    });

    await record({
      action: "analysis.completed",
      summary: `Completed ${result.category} analysis with ${result.severity} severity.`,
      allowed: true,
      metadata: {
        severity: result.severity,
        confidence: result.confidence,
        indicatorCount: result.indicators.length,
        timelineCount: result.timeline.length
      }
    });

    const cyberCase = this.caseService.buildCase(input, {
      id: caseId,
      rawInputRef,
      result,
      auditEntries
    });
    cyberCase.safetyDecisions.push(safety);
    cyberCase.promptInjectionFindings.push(...promptInjectionFindings);
    cyberCase.outputSafetyResults.push(...outputSafetyResults);
    cyberCase.sensitiveFindings.push(...sensitiveFindings);
    cyberCase.redactedArtifacts.push(...redactedArtifacts);
    cyberCase.promptPackages.push(...promptPackages);
    cyberCase.dataClassifications.push(...dataClassifications);
    cyberCase.privacyAuditEvents.push(...privacyAuditEvents);
    cyberCase.providerCalls.push(...providerCalls);
    cyberCase.structuredOutputValidations.push(...structuredOutputValidations);
    cyberCase.usageRecords.push(...usageRecords);
    cyberCase.groundingFindings.push(...groundingFindings);
    cyberCase.knowledgeCitationQualities.push(...knowledgeCitationQualities);
    cyberCase.reasoningHypothesisNodes.push(...reasoningV2.hypothesisNodes);
    cyberCase.reasoningContradictions.push(...reasoningV2.contradictions);
    cyberCase.reasoningUnknownRecords.push(...reasoningV2.unknownRecords);
    cyberCase.techniqueMappings.push(...reasoningV2.techniqueMappings);
    if (threatIntel) {
      cyberCase.threatIntelSources.push(...threatIntel.threatIntelSources);
      cyberCase.indicatorEnrichments.push(...threatIntel.indicatorEnrichments);
      cyberCase.threatContextSummaries.push(...threatIntel.threatContextSummaries);
    }
    await this.caseService.saveCase(cyberCase);

    return {
      allowed: true,
      caseId,
      case: cyberCase,
      result,
      observations: reasoning.observations,
      hypotheses: reasoning.hypotheses,
      findings: reasoning.findings,
      artifacts: ingestion.artifacts,
      normalizedEvents: ingestion.normalizedEvents,
      entities: ingestion.entities,
      safetyDecision: safety,
      promptInjectionFindings,
      outputSafetyResults,
      indicatorEnrichments: threatIntel?.indicatorEnrichments,
      threatContextSummaries: threatIntel?.threatContextSummaries,
      sensitiveFindings,
      redactedArtifacts,
      promptPackages,
      dataClassifications,
      privacyAuditEvents,
      providerCalls,
      structuredOutputValidations,
      usageRecords,
      groundingFindings,
      knowledgeCitationQualities,
      auditEntries
    };
  }
}
