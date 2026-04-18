import path from "node:path";
import type { AuditEntry, CaseListItem, CyberCase } from "../schemas/case.schema";
import { cyberCaseSchema } from "../schemas/case.schema";
import type { AnalyzeInput } from "../schemas/input.schema";
import { inferInputType } from "../schemas/input.schema";
import type { AnalysisResult, Refusal } from "../schemas/result.schema";
import { ensureDir, listJsonFiles, readJsonFile, writeJsonFile } from "../utils/files";
import { nowIso, compareIsoDesc } from "../utils/time";
import { generateDefaultTasks, workflowPriorityFromResult } from "../workflow/task-service";
import { getReportTemplates } from "../reports/template-registry";
import { activePolicyVersionRecord } from "../safety/policy-engine";
import { agentRoles } from "../agents/agent-task-service";

export class CaseService {
  constructor(private readonly dataDir: string) {}

  private casePath(caseId: string): string {
    return path.join(this.dataDir, "cases", `${caseId}.json`);
  }

  async saveCase(cyberCase: CyberCase): Promise<CyberCase> {
    const parsed = cyberCaseSchema.parse(cyberCase);
    await ensureDir(path.dirname(this.casePath(parsed.id)));
    await writeJsonFile(this.casePath(parsed.id), parsed);
    return parsed;
  }

  async getCase(caseId: string): Promise<CyberCase | null> {
    try {
      return cyberCaseSchema.parse(await readJsonFile<CyberCase>(this.casePath(caseId)));
    } catch {
      return null;
    }
  }

  async listCases(): Promise<CaseListItem[]> {
    const files = await listJsonFiles(path.join(this.dataDir, "cases"));
    const cases = await Promise.all(
      files.map(async (file) => {
        const cyberCase = cyberCaseSchema.parse(await readJsonFile<CyberCase>(file));
        return {
          id: cyberCase.id,
          title: cyberCase.title,
          createdAt: cyberCase.createdAt,
          updatedAt: cyberCase.updatedAt,
          mode: cyberCase.mode,
          severity: cyberCase.severity,
          state: cyberCase.state,
          priority: cyberCase.priority,
          summary: cyberCase.summary
        } satisfies CaseListItem;
      })
    );

    return cases.sort((a, b) => compareIsoDesc(a.updatedAt, b.updatedAt));
  }

  async listFullCases(): Promise<CyberCase[]> {
    const files = await listJsonFiles(path.join(this.dataDir, "cases"));
    const cases = await Promise.all(files.map(async (file) => cyberCaseSchema.parse(await readJsonFile<CyberCase>(file))));
    return cases.sort((a, b) => compareIsoDesc(a.updatedAt, b.updatedAt));
  }

  buildCase(input: AnalyzeInput, params: {
    id: string;
    rawInputRef: string;
    result?: AnalysisResult;
    refusal?: Refusal;
    auditEntries: AuditEntry[];
  }): CyberCase {
    const createdAt = nowIso();
    const title = input.title ?? params.result?.title ?? "Blocked Defensive Cyber Request";
    const tasks = params.result ? generateDefaultTasks(params.result) : [];

    return {
      id: params.id,
      title,
      tenantId: "tenant_default",
      accessLabels: ["tenant:tenant_default"],
      createdAt,
      updatedAt: createdAt,
      inputType: inferInputType(input),
      mode: input.mode,
      rawInputRef: params.rawInputRef,
      normalizedArtifacts: params.result?.ingestion?.entities ?? params.result?.indicators ?? [],
      severity: params.result?.severity ?? "low",
      state: params.refusal ? "closed" : "new",
      priority: workflowPriorityFromResult(params.result),
      tags: params.result ? [params.result.category, input.mode] : ["refusal"],
      tasks,
      decisions: [],
      workflowTransitions: [
        {
          id: "transition_001",
          from: "new",
          to: params.refusal ? "closed" : "new",
          actor: "system",
          reason: params.refusal ? "Request was blocked by guardrail." : "Case created from analysis.",
          timestamp: createdAt
        }
      ],
      toolCalls: [],
      toolResults: [],
      sandboxRuns: [],
      sandboxArtifacts: [],
      actionPlans: [],
      approvalRequests: [],
      actionExecutions: [],
      detectionIntents: [],
      detectionRules: [],
      detectionRulesV2: [],
      ruleTestCases: [],
      ruleValidationResults: [],
      detectionCorpusItems: [],
      corpusRunResults: [],
      ruleValidationResultsV2: [],
      falsePositiveResults: [],
      detectionDeployments: [],
      reportTemplates: getReportTemplates(),
      reportDrafts: [],
      reportVersions: [],
      reportCitations: [],
      redactionResults: [],
      safetyDecisions: [],
      policyVersions: [activePolicyVersionRecord()],
      promptInjectionFindings: [],
      outputSafetyResults: [],
      authorizationScopes: [],
      validationCampaigns: [],
      validationObjectives: [],
      telemetryExpectations: [],
      validationResults: [],
      vulnerabilityFindings: [],
      vulnerabilityContexts: [],
      assetRiskProfiles: [],
      vulnerabilityRemediationTasks: [],
      riskExceptions: [],
      cloudAccounts: [],
      identityPrincipals: [],
      cloudEvents: [],
      postureFindings: [],
      permissionRisks: [],
      endpointEvents: [],
      processTrees: [],
      forensicArtifacts: [],
      forensicTimeline: [],
      sampleAnalysisSummaries: [],
      fileTriageSummaries: [],
      sandboxBehaviors: [],
      yaraExplanations: [],
      malwareIocSets: [],
      forensicCollectionTasks: [],
      threatIntelSources: [],
      indicatorEnrichments: [],
      internalSightings: [],
      indicatorLifecycle: [],
      threatContextSummaries: [],
      intelSourcesV2: [],
      stixObjects: [],
      intelRelationships: [],
      internalPrevalenceRecords: [],
      retroHunts: [],
      agentRoles,
      agentTasks: [],
      agentResults: [],
      orchestrationRuns: [],
      arbitrationResults: [],
      agentRoleContracts: [],
      agentTraces: [],
      agentMemoryItems: [],
      reviewerFindings: [],
      arbitrationResultsV2: [],
      operatorOverrides: [],
      sensitiveFindings: [],
      redactedArtifacts: [],
      promptPackages: [],
      dataClassifications: [],
      privacyAuditEvents: [],
      providerCalls: [],
      structuredOutputValidations: [],
      usageRecords: [],
      groundingFindings: [],
      knowledgeCitationQualities: [],
      analystNotes: [],
      connectorEvidenceRefs: [],
      evidenceSources: [],
      evidenceRecords: [],
      chainOfCustodyEntries: [],
      deduplicationRecords: [],
      reasoningHypothesisNodes: [],
      reasoningContradictions: [],
      reasoningUnknownRecords: [],
      techniqueMappings: [],
      reasoningReviews: [],
      summary: params.result?.summary ?? "Request was blocked by the defensive-only safety guardrail.",
      recommendations: params.result?.recommendedActions ?? [
        params.refusal?.safeRedirect ?? "Use the agent for defensive analysis, hardening, detection, or response planning."
      ],
      reportMarkdown: params.result?.reportMarkdown ?? "# Defensive-only refusal\n\nThe request was blocked before model execution.",
      result: params.result,
      refusal: params.refusal,
      auditEntries: params.auditEntries
    };
  }

  async appendAudit(caseId: string, entry: AuditEntry): Promise<CyberCase | null> {
    const existing = await this.getCase(caseId);
    if (!existing) {
      return null;
    }

    existing.auditEntries.push(entry);
    existing.updatedAt = nowIso();
    await this.saveCase(existing);
    return existing;
  }
}
