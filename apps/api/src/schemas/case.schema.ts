import { z } from "zod";
import { analysisModeSchema } from "./input.schema";
import { analysisResultSchema, refusalSchema, severitySchema } from "./result.schema";
import {
  caseStateSchema,
  decisionRecordSchema,
  investigationTaskSchema,
  workflowPrioritySchema,
  workflowTransitionSchema
} from "./workflow.schema";
import { toolCallSchema, toolResultSchema } from "./tools.schema";
import { actionExecutionSchema, actionPlanSchema, approvalRequestSchema } from "./actions.schema";
import { detectionIntentSchema, detectionRuleSchema, ruleTestCaseSchema, ruleValidationResultSchema } from "./detections.schema";
import {
  detectionCorpusItemSchema,
  detectionDeploymentSchema,
  detectionRuleV2Schema,
  detectionRuleValidationV2Schema,
  corpusRunResultSchema,
  falsePositiveSimulationResultSchema
} from "./detections-v2.schema";
import {
  redactionResultSchema,
  reportCitationSchema,
  reportDraftSchema,
  reportTemplateSchema,
  reportVersionSchema
} from "./reports.schema";
import {
  outputSafetyResultSchema,
  policyVersionRecordSchema,
  promptInjectionFindingSchema,
  safetyDecisionSchema
} from "./safety.schema";
import {
  authorizationScopeSchema,
  telemetryExpectationSchema,
  validationCampaignSchema,
  validationObjectiveSchema,
  validationResultSchema
} from "./validation.schema";
import {
  assetRiskProfileSchema,
  riskExceptionSchema,
  vulnerabilityContextSchema,
  vulnerabilityFindingSchema,
  vulnerabilityRemediationTaskSchema
} from "./vulnerabilities.schema";
import {
  cloudAccountSchema,
  cloudEventSchema,
  identityPrincipalSchema,
  permissionRiskSchema,
  postureFindingSchema
} from "./cloud-security.schema";
import {
  endpointEventSchema,
  forensicArtifactSchema,
  forensicTimelineEventSchema,
  processTreeSchema,
  sampleAnalysisSummarySchema
} from "./endpoint.schema";
import {
  indicatorEnrichmentSchema,
  indicatorLifecycleSchema,
  internalSightingSchema,
  threatContextSummarySchema,
  threatIntelSourceSchema
} from "./threat-intel.schema";
import {
  intelRelationshipSchema,
  intelSourceSchema,
  internalPrevalenceRecordSchema,
  retroHuntRequestSchema,
  stixObjectRecordSchema
} from "./threat-intel-v2.schema";
import {
  agentResultSchema,
  agentRoleSchema,
  agentTaskSchema,
  arbitrationResultSchema,
  orchestrationRunSchema
} from "./agents.schema";
import {
  agentMemoryItemSchema,
  agentRoleContractSchema,
  agentTraceSchema,
  arbitrationV2ResultSchema,
  operatorOverrideSchema,
  reviewerFindingSchema
} from "./agents-v2.schema";
import {
  dataClassificationSchema,
  privacyAuditEventSchema,
  promptPackageSchema,
  redactedArtifactSchema,
  sensitiveFindingSchema
} from "./privacy.schema";
import { providerCallSchema, structuredOutputValidationSchema, usageRecordSchema } from "./providers.schema";
import { groundingFindingSchema } from "./model-quality.schema";
import { citationQualitySchema } from "./knowledge-v2.schema";
import { analystNoteSchema } from "./collaboration.schema";
import { connectorEvidenceRefSchema } from "./connectors.schema";
import {
  contradictionRecordSchema,
  hypothesisNodeSchema,
  reasoningReviewSchema,
  techniqueMappingSchema,
  unknownRecordSchema
} from "./reasoning-v2.schema";
import {
  chainOfCustodyEntrySchema,
  deduplicationRecordSchema,
  evidenceRecordSchema,
  evidenceSourceSchema
} from "./ingestion.schema";
import {
  fileTriageSummarySchema,
  forensicCollectionTaskSchema,
  malwareIocSetSchema,
  sandboxBehaviorSchema,
  yaraMatchExplanationSchema
} from "./malware-forensics.schema";
import { sandboxArtifactSchema, sandboxRunSchema } from "./sandbox.schema";

export const auditEntrySchema = z.object({
  id: z.string(),
  caseId: z.string().optional(),
  timestamp: z.string(),
  action: z.string(),
  summary: z.string(),
  allowed: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const cyberCaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  tenantId: z.string().default("tenant_default"),
  accessLabels: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
  inputType: z.string(),
  mode: analysisModeSchema,
  rawInputRef: z.string(),
  normalizedArtifacts: z.array(z.unknown()),
  severity: severitySchema,
  state: caseStateSchema.default("new"),
  priority: workflowPrioritySchema.default("medium"),
  assignedTo: z.string().optional(),
  tags: z.array(z.string()).default([]),
  tasks: z.array(investigationTaskSchema).default([]),
  decisions: z.array(decisionRecordSchema).default([]),
  workflowTransitions: z.array(workflowTransitionSchema).default([]),
  toolCalls: z.array(toolCallSchema).default([]),
  toolResults: z.array(toolResultSchema).default([]),
  sandboxRuns: z.array(sandboxRunSchema).default([]),
  sandboxArtifacts: z.array(sandboxArtifactSchema).default([]),
  actionPlans: z.array(actionPlanSchema).default([]),
  approvalRequests: z.array(approvalRequestSchema).default([]),
  actionExecutions: z.array(actionExecutionSchema).default([]),
  detectionIntents: z.array(detectionIntentSchema).default([]),
  detectionRules: z.array(detectionRuleSchema).default([]),
  detectionRulesV2: z.array(detectionRuleV2Schema).default([]),
  ruleTestCases: z.array(ruleTestCaseSchema).default([]),
  ruleValidationResults: z.array(ruleValidationResultSchema).default([]),
  detectionCorpusItems: z.array(detectionCorpusItemSchema).default([]),
  corpusRunResults: z.array(corpusRunResultSchema).default([]),
  ruleValidationResultsV2: z.array(detectionRuleValidationV2Schema).default([]),
  falsePositiveResults: z.array(falsePositiveSimulationResultSchema).default([]),
  detectionDeployments: z.array(detectionDeploymentSchema).default([]),
  reportTemplates: z.array(reportTemplateSchema).default([]),
  reportDrafts: z.array(reportDraftSchema).default([]),
  reportVersions: z.array(reportVersionSchema).default([]),
  reportCitations: z.array(reportCitationSchema).default([]),
  redactionResults: z.array(redactionResultSchema).default([]),
  safetyDecisions: z.array(safetyDecisionSchema).default([]),
  policyVersions: z.array(policyVersionRecordSchema).default([]),
  promptInjectionFindings: z.array(promptInjectionFindingSchema).default([]),
  outputSafetyResults: z.array(outputSafetyResultSchema).default([]),
  authorizationScopes: z.array(authorizationScopeSchema).default([]),
  validationCampaigns: z.array(validationCampaignSchema).default([]),
  validationObjectives: z.array(validationObjectiveSchema).default([]),
  telemetryExpectations: z.array(telemetryExpectationSchema).default([]),
  validationResults: z.array(validationResultSchema).default([]),
  vulnerabilityFindings: z.array(vulnerabilityFindingSchema).default([]),
  vulnerabilityContexts: z.array(vulnerabilityContextSchema).default([]),
  assetRiskProfiles: z.array(assetRiskProfileSchema).default([]),
  vulnerabilityRemediationTasks: z.array(vulnerabilityRemediationTaskSchema).default([]),
  riskExceptions: z.array(riskExceptionSchema).default([]),
  cloudAccounts: z.array(cloudAccountSchema).default([]),
  identityPrincipals: z.array(identityPrincipalSchema).default([]),
  cloudEvents: z.array(cloudEventSchema).default([]),
  postureFindings: z.array(postureFindingSchema).default([]),
  permissionRisks: z.array(permissionRiskSchema).default([]),
  endpointEvents: z.array(endpointEventSchema).default([]),
  processTrees: z.array(processTreeSchema).default([]),
  forensicArtifacts: z.array(forensicArtifactSchema).default([]),
  forensicTimeline: z.array(forensicTimelineEventSchema).default([]),
  sampleAnalysisSummaries: z.array(sampleAnalysisSummarySchema).default([]),
  fileTriageSummaries: z.array(fileTriageSummarySchema).default([]),
  sandboxBehaviors: z.array(sandboxBehaviorSchema).default([]),
  yaraExplanations: z.array(yaraMatchExplanationSchema).default([]),
  malwareIocSets: z.array(malwareIocSetSchema).default([]),
  forensicCollectionTasks: z.array(forensicCollectionTaskSchema).default([]),
  threatIntelSources: z.array(threatIntelSourceSchema).default([]),
  indicatorEnrichments: z.array(indicatorEnrichmentSchema).default([]),
  internalSightings: z.array(internalSightingSchema).default([]),
  indicatorLifecycle: z.array(indicatorLifecycleSchema).default([]),
  threatContextSummaries: z.array(threatContextSummarySchema).default([]),
  intelSourcesV2: z.array(intelSourceSchema).default([]),
  stixObjects: z.array(stixObjectRecordSchema).default([]),
  intelRelationships: z.array(intelRelationshipSchema).default([]),
  internalPrevalenceRecords: z.array(internalPrevalenceRecordSchema).default([]),
  retroHunts: z.array(retroHuntRequestSchema).default([]),
  agentRoles: z.array(agentRoleSchema).default([]),
  agentTasks: z.array(agentTaskSchema).default([]),
  agentResults: z.array(agentResultSchema).default([]),
  orchestrationRuns: z.array(orchestrationRunSchema).default([]),
  arbitrationResults: z.array(arbitrationResultSchema).default([]),
  agentRoleContracts: z.array(agentRoleContractSchema).default([]),
  agentTraces: z.array(agentTraceSchema).default([]),
  agentMemoryItems: z.array(agentMemoryItemSchema).default([]),
  reviewerFindings: z.array(reviewerFindingSchema).default([]),
  arbitrationResultsV2: z.array(arbitrationV2ResultSchema).default([]),
  operatorOverrides: z.array(operatorOverrideSchema).default([]),
  sensitiveFindings: z.array(sensitiveFindingSchema).default([]),
  redactedArtifacts: z.array(redactedArtifactSchema).default([]),
  promptPackages: z.array(promptPackageSchema).default([]),
  dataClassifications: z.array(dataClassificationSchema).default([]),
  privacyAuditEvents: z.array(privacyAuditEventSchema).default([]),
  providerCalls: z.array(providerCallSchema).default([]),
  structuredOutputValidations: z.array(structuredOutputValidationSchema).default([]),
  usageRecords: z.array(usageRecordSchema).default([]),
  groundingFindings: z.array(groundingFindingSchema).default([]),
  knowledgeCitationQualities: z.array(citationQualitySchema).default([]),
  analystNotes: z.array(analystNoteSchema).default([]),
  connectorEvidenceRefs: z.array(connectorEvidenceRefSchema).default([]),
  evidenceSources: z.array(evidenceSourceSchema).default([]),
  evidenceRecords: z.array(evidenceRecordSchema).default([]),
  chainOfCustodyEntries: z.array(chainOfCustodyEntrySchema).default([]),
  deduplicationRecords: z.array(deduplicationRecordSchema).default([]),
  reasoningHypothesisNodes: z.array(hypothesisNodeSchema).default([]),
  reasoningContradictions: z.array(contradictionRecordSchema).default([]),
  reasoningUnknownRecords: z.array(unknownRecordSchema).default([]),
  techniqueMappings: z.array(techniqueMappingSchema).default([]),
  reasoningReviews: z.array(reasoningReviewSchema).default([]),
  summary: z.string(),
  recommendations: z.array(z.string()),
  reportMarkdown: z.string(),
  result: analysisResultSchema.optional(),
  refusal: refusalSchema.optional(),
  auditEntries: z.array(auditEntrySchema)
});

export type AuditEntry = z.infer<typeof auditEntrySchema>;
export type CyberCase = z.infer<typeof cyberCaseSchema>;

export type CaseListItem = Pick<
  CyberCase,
  "id" | "title" | "createdAt" | "updatedAt" | "mode" | "severity" | "state" | "priority" | "summary"
>;
