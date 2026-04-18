export type AnalysisMode = "alert" | "logs" | "iocs" | "hardening";
export type Severity = "low" | "medium" | "high" | "critical";
export type CaseState = "new" | "triaging" | "investigating" | "contained" | "remediating" | "monitoring" | "closed";
export type WorkflowPriority = "low" | "medium" | "high" | "critical";
export type TaskStatus = "open" | "in_progress" | "blocked" | "done" | "cancelled";

export interface Indicator {
  type: string;
  value: string;
  normalized: string;
  source?: string;
}

export interface TimelineEvent {
  timestamp: string;
  label: string;
  source?: string;
  raw?: string;
}

export interface SourceRef {
  id: string;
  type: "input" | "adapter" | "indicator" | "timeline" | "provider";
  locator: string;
  excerpt?: string;
}

export interface Observation {
  id: string;
  type: "fact" | "indicator" | "timeline_event" | "analyst_note" | "unknown";
  value: string;
  confidence: number;
  sourceRef: SourceRef;
  timestamp?: string;
  entityRefs: string[];
}

export interface Hypothesis {
  id: string;
  title: string;
  status: "supported" | "needs_review" | "rejected";
  confidence: number;
  reasoningSummary: string;
  supportingObservationIds: string[];
  contradictingObservationIds: string[];
  assumptions: string[];
  unknowns: string[];
}

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  category: string;
  confidence: number;
  reasoningSummary: string;
  evidenceObservationIds: string[];
  recommendations: string[];
  needsAnalystReview: boolean;
}

export interface ReasoningRun {
  id: string;
  provider: string;
  model: string;
  promptVersion: string;
  inputHash: string;
  outputHash?: string;
  validationStatus: "passed" | "failed" | "blocked";
  validationSummary: string;
  startedAt: string;
  completedAt?: string;
}

export interface ReasoningBundle {
  observations: Observation[];
  hypotheses: Hypothesis[];
  findings: Finding[];
  reasoningRuns: ReasoningRun[];
  assumptions: string[];
  unknowns: string[];
}

export interface KnowledgeCitation {
  sourceId: string;
  title: string;
  uri: string;
  location: string;
  trustTier: "internal" | "standard" | "vendor" | "community";
  version: string;
  reviewAt?: string;
  stale: boolean;
}

export interface CitationQuality {
  citationId: string;
  sourceId: string;
  relevance: number;
  freshness: number;
  trust: number;
  warnings: string[];
}

export interface RetrievalResult {
  chunkId: string;
  score: number;
  excerpt: string;
  citation: KnowledgeCitation;
  citationQuality?: CitationQuality;
}

export interface RetrievalSnapshot {
  id: string;
  caseId: string;
  query: string;
  resultChunkIds: string[];
  createdAt: string;
  promptIncluded: boolean;
}

export interface KnowledgeContext {
  query: string;
  results: RetrievalResult[];
  snapshots: RetrievalSnapshot[];
  warnings: string[];
}

export interface IngestSourceRef {
  artifactId: string;
  parserId: string;
  lineNumber?: number;
  jsonPointer?: string;
  byteRange?: [number, number];
  excerpt?: string;
}

export interface UploadedArtifact {
  id: string;
  filename: string;
  mediaType: string;
  hash: string;
  sizeBytes: number;
  storageRef: string;
  source: "inline" | "upload";
  createdAt: string;
}

export interface NormalizedEntity {
  id: string;
  type: string;
  value: string;
  normalized: string;
  aliases: string[];
}

export interface NormalizedEvent {
  id: string;
  timestamp?: string;
  source: string;
  eventType: string;
  severity: Severity;
  actor?: string;
  asset?: string;
  network: {
    srcIp?: string;
    dstIp?: string;
    srcPort?: string;
    dstPort?: string;
  };
  process: {
    image?: string;
    parentImage?: string;
    commandLine?: string;
  };
  entityIds: string[];
  rawRef: IngestSourceRef;
}

export interface ParserWarning {
  parserId: string;
  sourceRef: IngestSourceRef;
  message: string;
  severity: "info" | "warning" | "error";
}

export interface IngestionBundle {
  artifacts: UploadedArtifact[];
  normalizedEvents: NormalizedEvent[];
  entities: NormalizedEntity[];
  parserWarnings: ParserWarning[];
}

export interface InvestigationTask {
  id: string;
  title: string;
  description?: string;
  owner?: string;
  priority: WorkflowPriority;
  status: TaskStatus;
  dueAt?: string;
  linkedFindingIds: string[];
  required: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DecisionRecord {
  id: string;
  decisionType: "note" | "closure_override" | "risk_acceptance" | "escalation";
  decision: string;
  rationale: string;
  approver: string;
  evidenceRefs: string[];
  timestamp: string;
}

export interface WorkflowTransition {
  id: string;
  from: CaseState;
  to: CaseState;
  actor: string;
  reason: string;
  timestamp: string;
}

export interface ToolCall {
  id: string;
  caseId: string;
  connectorId: string;
  operation: string;
  actor: string;
  parametersHash: string;
  status: "allowed" | "denied" | "completed" | "failed";
  timestamp: string;
  summary: string;
}

export interface ToolResult {
  id: string;
  toolCallId: string;
  status: "success" | "error";
  summary: string;
  recordRefs: string[];
  records: Array<Record<string, unknown>>;
  sensitiveFields: string[];
  redactionStatus: "not_required" | "redacted";
}

export interface ActionStep {
  id: string;
  title: string;
  connectorId: string;
  operation: string;
  parametersHash: string;
  parameterSummary: string;
  risk: WorkflowPriority;
  approvalRequired: boolean;
  status: "planned" | "dry_run_ready" | "approved" | "executed" | "blocked" | "failed";
  dryRunResult?: string;
  rollbackHint?: string;
}

export interface ActionPlan {
  id: string;
  caseId: string;
  objective: string;
  risk: WorkflowPriority;
  targetEntityIds: string[];
  expectedOutcome: string;
  steps: ActionStep[];
  status: "planned" | "dry_run_ready" | "approved" | "executed" | "blocked";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalRequest {
  id: string;
  actionPlanId: string;
  approverRole: string;
  requestedBy: string;
  status: "pending" | "approved" | "rejected";
  reason: string;
  decidedBy?: string;
  decidedAt?: string;
  createdAt: string;
}

export interface ActionExecution {
  id: string;
  actionPlanId: string;
  actionStepId: string;
  status: "success" | "blocked" | "failed";
  result: string;
  rollbackHint?: string;
  timestamp: string;
}

export interface DetectionIntent {
  id: string;
  behavior: string;
  category: string;
  severity: Severity;
  dataSources: string[];
  entities: string[];
  evidenceRefs: string[];
  createdAt: string;
}

export interface DetectionCoverage {
  tactic: string;
  technique: string;
  dataSource: string;
  confidence: number;
}

export interface SigmaLikeRule {
  title: string;
  id: string;
  status: "experimental" | "test" | "stable";
  description: string;
  logsource: {
    product: string;
    category: string;
    service?: string;
  };
  detection: {
    selection: Record<string, string[]>;
    condition: "selection";
  };
  fields: string[];
  falsepositives: string[];
  level: Severity;
}

export interface DetectionRule {
  id: string;
  intentId: string;
  format: "sigma-like-json" | "pseudo-query";
  title: string;
  logic: SigmaLikeRule;
  query: string;
  fields: string[];
  falsePositiveNotes: string[];
  validationStatus: "untested" | "passed" | "failed";
  coverage: DetectionCoverage;
  exportText: string;
  createdAt: string;
}

export interface RuleTestCase {
  id: string;
  name: string;
  event: Record<string, unknown>;
  expectedMatch: boolean;
  reason: string;
}

export interface RuleTestResult {
  testCaseId: string;
  expectedMatch: boolean;
  actualMatch: boolean;
  passed: boolean;
  reason: string;
}

export interface RuleValidationResult {
  id: string;
  ruleId: string;
  schemaStatus: "passed" | "failed";
  fixtureStatus: "not_run" | "passed" | "failed";
  warnings: string[];
  passed: boolean;
  testResults: RuleTestResult[];
  createdAt: string;
}

export type ReportAudience = "executive" | "technical" | "external";
export type ReportStatus = "draft" | "in_review" | "approved";
export type SafetyCategory = "defensive" | "authorized_validation" | "lab" | "ambiguous" | "blocked";
export type SafetyLayer = "input" | "retrieval" | "output" | "tool";
export type SafetyReason =
  | "allowed_defensive"
  | "allowed_authorized_validation"
  | "allowed_lab"
  | "artifact_evidence_allowed"
  | "scope_clarification_required"
  | "offensive_request_detected"
  | "unsafe_output_detected"
  | "tool_policy_requires_approval";

export interface ReportSection {
  id: string;
  title: string;
  required: boolean;
  guidance?: string;
}

export interface ReportFieldRule {
  sectionId: string;
  required: boolean;
  maxLength?: number;
  redactForAudiences: ReportAudience[];
}

export interface ReportTemplate {
  id: string;
  name: string;
  audience: ReportAudience;
  requiredSections: string[];
  sections: ReportSection[];
  fieldRules: ReportFieldRule[];
}

export interface ReportCitation {
  id: string;
  reportId: string;
  claimId: string;
  sourceRef: string;
  observationId?: string;
  findingId?: string;
  confidence: number;
}

export interface ReportDraft {
  id: string;
  caseId: string;
  templateId: string;
  audience: ReportAudience;
  title: string;
  contentMarkdown: string;
  citations: ReportCitation[];
  status: ReportStatus;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportVersion {
  id: string;
  draftId: string;
  version: number;
  editor: string;
  diffSummary: string;
  contentMarkdown: string;
  timestamp: string;
}

export interface RedactedField {
  fieldType: "ipv4" | "ipv6" | "email" | "username" | "secret";
  count: number;
  replacement: string;
}

export interface RedactionResult {
  id: string;
  reportId: string;
  audience: ReportAudience;
  redactedMarkdown: string;
  redactedFields: RedactedField[];
  warnings: string[];
  createdAt: string;
}

export interface PolicyVersionRecord {
  version: string;
  active: boolean;
  description: string;
  createdAt: string;
}

export interface SafetyDecision {
  id: string;
  layer: SafetyLayer;
  allowed: boolean;
  category: SafetyCategory;
  reason: SafetyReason;
  matchedSignals: string[];
  safeRedirect?: string;
  policyVersion: string;
  createdAt: string;
}

export interface PromptInjectionFinding {
  id: string;
  sourceRef: string;
  pattern: string;
  risk: "low" | "medium" | "high";
  mitigation: string;
  createdAt: string;
}

export interface OutputSafetyResult {
  id: string;
  allowed: boolean;
  blockedSegments: string[];
  repairedOutput?: string;
  reason?: SafetyReason;
  policyVersion: string;
  createdAt: string;
}

export type ValidationStatus = "planned" | "in_progress" | "completed" | "blocked";
export type ValidationResultStatus = "passed" | "partial" | "failed";

export interface AuthorizationScope {
  id: string;
  name: string;
  assets: string[];
  owners: string[];
  startsAt: string;
  expiresAt: string;
  approvers: string[];
  allowedTestTypes: string[];
  exclusions: string[];
  createdAt: string;
}

export interface TelemetryExpectation {
  id: string;
  campaignId: string;
  objectiveId: string;
  dataSource: string;
  expectedEventType: string;
  detectionRuleRef?: string;
  required: boolean;
}

export interface ValidationObjective {
  id: string;
  campaignId: string;
  templateId: string;
  title: string;
  category: string;
  expectedTelemetry: TelemetryExpectation[];
  successCriteria: string[];
  safetyNotes: string[];
  createdAt: string;
}

export interface ValidationCampaign {
  id: string;
  scopeId: string;
  objective: string;
  controlsUnderTest: string[];
  status: ValidationStatus;
  owner: string;
  safetyWarnings: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ValidationResult {
  id: string;
  campaignId: string;
  observedTelemetry: string[];
  gaps: string[];
  remediationTasks: string[];
  evidenceRefs: string[];
  status: ValidationResultStatus;
  createdAt: string;
}

export type Exposure = "internet" | "internal" | "isolated";
export type ExploitMaturity = "none" | "poc" | "active" | "unknown";

export interface VulnerabilityFinding {
  id: string;
  cve: string;
  title: string;
  scanner: string;
  assetId: string;
  assetName: string;
  severity: Severity;
  evidence: string;
  firstSeen: string;
  riskScore: number;
  priority: WorkflowPriority;
  riskSummary: string;
}

export interface VulnerabilityContext {
  findingId: string;
  epss: number;
  kev: boolean;
  cvss?: number;
  vendorAdvisory?: string;
  exposure: Exposure;
  exploitMaturity: ExploitMaturity;
  exploitMaturitySummary: string;
}

export interface AssetRiskProfile {
  assetId: string;
  assetName: string;
  businessCriticality: WorkflowPriority;
  internetExposure: boolean;
  owner: string;
  compensatingControls: string[];
}

export interface VulnerabilityRemediationTask {
  id: string;
  findingId: string;
  action: string;
  owner: string;
  dueDate: string;
  validationMethod: string;
  status: "open" | "in_progress" | "done" | "accepted_risk";
  createdAt: string;
}

export interface RiskException {
  id: string;
  findingId: string;
  acceptedRisk: string;
  approver: string;
  expiresAt: string;
  compensatingControls: string[];
  status: "active" | "expired";
  createdAt: string;
}

export type CloudProvider = "aws" | "azure" | "gcp" | "entra" | "okta" | "generic";
export type PrincipalType = "user" | "group" | "role" | "service_account" | "workload_identity";

export interface CloudAccount {
  id: string;
  provider: CloudProvider;
  accountId: string;
  tenantId?: string;
  environment: string;
  owner: string;
  createdAt: string;
}

export interface IdentityPrincipal {
  id: string;
  provider: CloudProvider;
  principalId: string;
  displayName: string;
  type: PrincipalType;
  mfaEnabled?: boolean;
  privilegedRoles: string[];
  lastSeenAt?: string;
}

export interface CloudEvent {
  id: string;
  caseId?: string;
  provider: CloudProvider;
  service: string;
  action: string;
  actor: string;
  resource: string;
  result: "success" | "failure" | "unknown";
  sourceIp?: string;
  timestamp: string;
  rawRef: string;
  riskSignals: string[];
}

export interface PostureFinding {
  id: string;
  caseId?: string;
  control: string;
  status: "pass" | "warn" | "fail";
  severity: Severity;
  evidenceRefs: string[];
  remediation: string;
  createdAt: string;
}

export interface PermissionRisk {
  id: string;
  caseId?: string;
  principalId: string;
  resource: string;
  riskyPermission: string;
  exposure: string;
  severity: Severity;
  recommendation: string;
  evidenceRefs: string[];
  createdAt: string;
}

export type ForensicArtifactType =
  | "process_logs"
  | "script_block_logs"
  | "prefetch"
  | "edr_alert"
  | "network_connection"
  | "user_session"
  | "file_hash"
  | "registry_snapshot";

export interface EndpointEvent {
  id: string;
  caseId?: string;
  host: string;
  user?: string;
  timestamp: string;
  eventType: string;
  processGuid: string;
  image: string;
  commandLine?: string;
  parentProcessGuid?: string;
  parentImage?: string;
  file?: string;
  registry?: string;
  network: {
    srcIp?: string;
    dstIp?: string;
    dstPort?: string;
  };
  sourceRef: string;
  riskSignals: string[];
}

export interface ProcessNode {
  processGuid: string;
  image: string;
  commandLine?: string;
  parentGuid?: string;
  eventIds: string[];
  riskSignals: string[];
  children: ProcessNode[];
}

export interface ProcessTree {
  id: string;
  caseId: string;
  host: string;
  roots: ProcessNode[];
  warnings: string[];
  createdAt: string;
}

export interface ForensicArtifact {
  id: string;
  caseId: string;
  type: ForensicArtifactType;
  source: string;
  collected: boolean;
  hash?: string;
  storageRef?: string;
  chainOfCustody: string[];
}

export interface ForensicTimelineEvent {
  id: string;
  caseId: string;
  timestamp: string;
  host: string;
  actor?: string;
  eventType: string;
  sourceRef: string;
  processGuid?: string;
  summary: string;
}

export interface SampleAnalysisSummary {
  id: string;
  caseId: string;
  hashes: string[];
  observedBehavior: string[];
  detections: string[];
  safeRemediationGuidance: string[];
  createdAt: string;
}

export interface ThreatIntelSource {
  id: string;
  name: string;
  type: "local" | "external" | "internal";
  trustTier: "internal" | "standard" | "vendor" | "community";
  reliability: number;
  terms: string;
  enabled: boolean;
}

export interface IndicatorEnrichment {
  id: string;
  caseId?: string;
  indicatorId: string;
  indicatorType: string;
  indicatorValue: string;
  sourceId: string;
  verdict: "benign" | "suspicious" | "malicious" | "unknown";
  confidence: number;
  tags: string[];
  firstSeen?: string;
  lastSeen?: string;
  createdAt: string;
}

export interface InternalSighting {
  id: string;
  caseId?: string;
  indicatorId: string;
  source: string;
  asset: string;
  timestamp: string;
  eventRef: string;
}

export interface IndicatorLifecycle {
  id: string;
  indicatorId: string;
  status: "active" | "expired" | "revoked" | "false_positive";
  expiresAt?: string;
  falsePositiveReason?: string;
  owner: string;
  updatedAt: string;
}

export interface ThreatContextSummary {
  id: string;
  caseId?: string;
  indicatorId: string;
  defensiveSummary: string;
  relatedBehaviors: string[];
  recommendedHandling: string[];
  confidence: number;
  createdAt: string;
}

export type AgentRoleId = "parser" | "investigator" | "retriever" | "reporter" | "safetyReviewer" | "toolExecutor";
export type AgentTaskStatus = "queued" | "running" | "completed" | "failed" | "blocked";
export type AgentValidationStatus = "passed" | "failed";
export type OrchestrationStatus = "planned" | "running" | "completed" | "failed" | "blocked";

export interface AgentRole {
  id: AgentRoleId;
  displayName: string;
  description: string;
  allowedTools: string[];
  maxTimeoutMs: number;
}

export interface AgentTask {
  id: string;
  caseId: string;
  runId: string;
  role: AgentRoleId;
  inputArtifactRefs: string[];
  expectedSchema: string;
  status: AgentTaskStatus;
  timeoutMs: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgentResult {
  id: string;
  taskId: string;
  role: AgentRoleId;
  output: Record<string, unknown>;
  validationStatus: AgentValidationStatus;
  confidence: number;
  warnings: string[];
  createdAt: string;
}

export interface OrchestrationRun {
  id: string;
  caseId: string;
  plan: string;
  taskIds: string[];
  finalStatus: OrchestrationStatus;
  createdAt: string;
  completedAt?: string;
}

export interface ArbitrationResult {
  id: string;
  runId: string;
  selectedFindingIds: string[];
  conflicts: string[];
  reviewerNotes: string;
  validationStatus: AgentValidationStatus;
  createdAt: string;
}

export type SensitiveFindingType = "api_key" | "cloud_access_key" | "email" | "private_key" | "secret" | "token" | "username";
export type RedactionMode = "off" | "metadata_only" | "redact";
export type DataClass = "public" | "internal" | "confidential" | "restricted";

export interface SensitiveFinding {
  id: string;
  type: SensitiveFindingType;
  sourceRef: string;
  start: number;
  end: number;
  confidence: number;
  redactionValue: string;
  fingerprintHash: string;
  length: number;
  createdAt: string;
}

export interface RedactedArtifact {
  id: string;
  originalRef: string;
  redactedRef: string;
  redactedText: string;
  findingIds: string[];
  redactionPolicyVersion: string;
  createdAt: string;
}

export interface PromptPackage {
  id: string;
  caseId: string;
  mode: RedactionMode;
  provider: string;
  minimizedFields: string[];
  excludedFindingIds: string[];
  redactionSummary: Record<string, number>;
  promptHash: string;
  rawInputHash: string;
  createdAt: string;
}

export interface DataClassification {
  id: string;
  resourceRef: string;
  dataClass: DataClass;
  reason: string;
  createdAt: string;
}

export interface PrivacyAuditEvent {
  id: string;
  caseId?: string;
  action: string;
  dataClass: DataClass;
  findingCount: number;
  summary: string;
  timestamp: string;
}

export type ProviderCapability = "streaming" | "json_schema" | "tool_calling" | "local_only";
export type ProviderType = "mock" | "ollama" | "openai-compatible";
export type ProviderCallStatus = "completed" | "blocked" | "failed";
export type StructuredOutputValidationStatus = "passed" | "failed" | "not_provided";

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  model: string;
  endpoint?: string;
  enabled: boolean;
  capabilities: ProviderCapability[];
  priority: number;
}

export interface ProviderTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ProviderCall {
  id: string;
  caseId: string;
  provider: string;
  model: string;
  promptVersion: string;
  taskType: string;
  status: ProviderCallStatus;
  latencyMs: number;
  tokens: ProviderTokenUsage;
  startedAt: string;
  completedAt: string;
  errorSummary?: string;
}

export interface StructuredOutputValidation {
  id: string;
  providerCallId: string;
  schemaName: string;
  status: StructuredOutputValidationStatus;
  reason: string;
  createdAt: string;
}

export interface UsageRecord {
  id: string;
  caseId?: string;
  provider: string;
  model: string;
  promptVersion: string;
  taskType: string;
  status: ProviderCallStatus;
  totalTokens: number;
  latencyMs: number;
  createdAt: string;
}

export interface ProviderHealth {
  provider: string;
  model: string;
  status: "healthy" | "degraded" | "disabled";
  latencyMs: number;
  checkedAt: string;
  message: string;
}

export interface ProviderUsageSummary {
  provider: string;
  model: string;
  calls: number;
  failures: number;
  blocked: number;
  totalTokens: number;
  averageLatencyMs: number;
}

export interface AuditEntry {
  id: string;
  caseId?: string;
  timestamp: string;
  action: string;
  summary: string;
  allowed?: boolean;
  metadata?: Record<string, unknown>;
}

export interface GroundingFinding {
  id: string;
  caseId: string;
  claim: string;
  status: "supported" | "weak" | "unsupported";
  evidenceRefs: string[];
  analystReviewRequired: boolean;
  reason: string;
  createdAt: string;
}

export interface AnalystNote {
  id: string;
  caseId: string;
  author: string;
  text: string;
  mentions: string[];
  visibility: "case" | "tenant" | "private";
  reviewStatus: "open" | "acknowledged" | "resolved";
  redacted: boolean;
  auditEntryId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseQueueItem {
  caseId: string;
  title: string;
  severity: Severity;
  priority: WorkflowPriority;
  state: CaseState;
  owner?: string;
  slaStatus: "ok" | "watch" | "overdue";
  flags: string[];
  updatedAt: string;
  openTaskCount: number;
  approvalCount: number;
  noteCount: number;
  safetyDecisionCount: number;
}

export interface ApprovalQueueItem {
  id: string;
  caseId: string;
  title: string;
  sourceType: "action" | "sandbox" | "validation";
  targetId: string;
  risk: WorkflowPriority;
  status: "pending" | "approved" | "rejected" | "blocked";
  approver?: string;
  reason: string;
  dueAt?: string;
  createdAt: string;
}

export interface DashboardMetric {
  name: string;
  value: number;
  labels: Record<string, string>;
  window: string;
}

export interface AnalysisResult {
  title: string;
  severity: Severity;
  confidence: number;
  category: string;
  summary: string;
  evidence: string[];
  recommendedActions: string[];
  indicators: Indicator[];
  timeline: TimelineEvent[];
  ingestion?: IngestionBundle;
  knowledge?: KnowledgeContext;
  reasoning?: ReasoningBundle;
  reportMarkdown: string;
  notes: string[];
}

export interface Refusal {
  allowed: false;
  reason: "offensive_request_detected" | "scope_clarification_required";
  safeRedirect: string;
  matchedSignals: string[];
}

export interface CyberCase {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  inputType: string;
  mode: AnalysisMode;
  rawInputRef: string;
  normalizedArtifacts: unknown[];
  severity: Severity;
  state: CaseState;
  priority: WorkflowPriority;
  assignedTo?: string;
  tags: string[];
  tasks: InvestigationTask[];
  decisions: DecisionRecord[];
  workflowTransitions: WorkflowTransition[];
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  actionPlans: ActionPlan[];
  approvalRequests: ApprovalRequest[];
  actionExecutions: ActionExecution[];
  detectionIntents: DetectionIntent[];
  detectionRules: DetectionRule[];
  ruleTestCases: RuleTestCase[];
  ruleValidationResults: RuleValidationResult[];
  reportTemplates: ReportTemplate[];
  reportDrafts: ReportDraft[];
  reportVersions: ReportVersion[];
  reportCitations: ReportCitation[];
  redactionResults: RedactionResult[];
  safetyDecisions: SafetyDecision[];
  policyVersions: PolicyVersionRecord[];
  promptInjectionFindings: PromptInjectionFinding[];
  outputSafetyResults: OutputSafetyResult[];
  authorizationScopes: AuthorizationScope[];
  validationCampaigns: ValidationCampaign[];
  validationObjectives: ValidationObjective[];
  telemetryExpectations: TelemetryExpectation[];
  validationResults: ValidationResult[];
  vulnerabilityFindings: VulnerabilityFinding[];
  vulnerabilityContexts: VulnerabilityContext[];
  assetRiskProfiles: AssetRiskProfile[];
  vulnerabilityRemediationTasks: VulnerabilityRemediationTask[];
  riskExceptions: RiskException[];
  cloudAccounts: CloudAccount[];
  identityPrincipals: IdentityPrincipal[];
  cloudEvents: CloudEvent[];
  postureFindings: PostureFinding[];
  permissionRisks: PermissionRisk[];
  endpointEvents: EndpointEvent[];
  processTrees: ProcessTree[];
  forensicArtifacts: ForensicArtifact[];
  forensicTimeline: ForensicTimelineEvent[];
  sampleAnalysisSummaries: SampleAnalysisSummary[];
  threatIntelSources: ThreatIntelSource[];
  indicatorEnrichments: IndicatorEnrichment[];
  internalSightings: InternalSighting[];
  indicatorLifecycle: IndicatorLifecycle[];
  threatContextSummaries: ThreatContextSummary[];
  agentRoles: AgentRole[];
  agentTasks: AgentTask[];
  agentResults: AgentResult[];
  orchestrationRuns: OrchestrationRun[];
  arbitrationResults: ArbitrationResult[];
  sensitiveFindings: SensitiveFinding[];
  redactedArtifacts: RedactedArtifact[];
  promptPackages: PromptPackage[];
  dataClassifications: DataClassification[];
  privacyAuditEvents: PrivacyAuditEvent[];
  providerCalls: ProviderCall[];
  structuredOutputValidations: StructuredOutputValidation[];
  usageRecords: UsageRecord[];
  groundingFindings: GroundingFinding[];
  knowledgeCitationQualities: CitationQuality[];
  analystNotes: AnalystNote[];
  summary: string;
  recommendations: string[];
  reportMarkdown: string;
  result?: AnalysisResult;
  refusal?: Refusal;
  auditEntries: AuditEntry[];
}

export type CaseListItem = Pick<
  CyberCase,
  "id" | "title" | "createdAt" | "updatedAt" | "mode" | "severity" | "state" | "priority" | "summary"
>;

export interface AnalyzeResponse {
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
  entities?: NormalizedEntity[];
  safetyDecision?: SafetyDecision;
  promptInjectionFindings?: PromptInjectionFinding[];
  outputSafetyResults?: OutputSafetyResult[];
  indicatorEnrichments?: IndicatorEnrichment[];
  threatContextSummaries?: ThreatContextSummary[];
  knowledgeCitationQualities?: CitationQuality[];
  auditEntries: AuditEntry[];
}
