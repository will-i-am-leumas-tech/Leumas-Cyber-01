import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { AnalyzePipeline } from "./pipeline/analyze-pipeline";
import type { CyberModelProvider } from "./providers/base-provider";
import { createProvider } from "./providers/provider-factory";
import { registerAnalyzeRoutes } from "./routes/analyze";
import { registerCaseRoutes } from "./routes/cases";
import { registerHealthRoutes } from "./routes/health";
import { registerWorkflowRoutes } from "./routes/workflow";
import { AuditService } from "./services/audit-service";
import { CaseService } from "./services/case-service";
import { KnowledgeService } from "./knowledge/ingest-service";
import { ensureDataDirs, resolveDataDir } from "./utils/files";
import { registerKnowledgeRoutes } from "./routes/knowledge";
import { registerToolRoutes } from "./routes/tools";
import { registerActionRoutes } from "./routes/actions";
import { registerDetectionRoutes } from "./routes/detections";
import { registerReportRoutes } from "./routes/reports";
import { registerSafetyRoutes } from "./routes/safety";
import { registerValidationRoutes } from "./routes/validation";
import { ValidationService } from "./validation/campaign-service";
import { registerVulnerabilityRoutes } from "./routes/vulnerabilities";
import { VulnerabilityService } from "./vulns/vulnerability-ingest-service";
import { registerCloudSecurityRoutes } from "./routes/cloud-security";
import { CloudSecurityService } from "./cloud/cloud-security-service";
import { registerEndpointRoutes } from "./routes/endpoint";
import { registerThreatIntelRoutes } from "./routes/threat-intel";
import { ThreatIntelService } from "./threat-intel/threat-intel-service";
import { registerAgentRoutes } from "./routes/agents";
import { AuditEventService } from "./audit/audit-event-service";
import { GovernanceExportService } from "./audit/governance-export-service";
import { registerAuditRoutes } from "./routes/audit";
import { registerPrivacyRoutes } from "./routes/privacy";
import { AuthService } from "./auth/auth-service";
import { registerDevAuthMiddleware } from "./auth/dev-auth-middleware";
import { registerAuthRoutes } from "./routes/auth";
import { InMemoryJobQueue } from "./jobs/job-queue";
import { registerJobRoutes } from "./routes/jobs";
import { registerSearchRoutes } from "./routes/search";
import { ErrorReporter } from "./observability/error-reporter";
import { HealthService } from "./observability/health-service";
import { MetricsService } from "./observability/metrics-service";
import { getRequestId, registerRequestContext } from "./observability/request-context";
import { registerObservabilityRoutes } from "./routes/observability";
import { createLocalJsonStorageAdapter } from "./storage/local/local-storage-adapter";
import { UsageAccountingService } from "./providers/usage-accounting";
import { registerProviderRoutes } from "./routes/providers";
import { registerDocsRoutes } from "./routes/docs";
import { registerConnectorRoutes } from "./routes/connectors";
import { EvidenceSourceRegistry } from "./ingestion/evidence-source-registry";
import { IngestionJobService } from "./ingestion/ingestion-job-service";
import { registerIngestionRoutes } from "./routes/ingestion";
import { registerMalwareForensicsRoutes } from "./routes/malware-forensics";
import { AuthorizationPolicyEngine } from "./auth/authorization-policy-engine";
import { BreakGlassService } from "./auth/break-glass-service";
import { ServiceAccountService } from "./auth/service-account-service";
import { TenantService } from "./auth/tenant-service";
import { registerAdminAccessRoutes } from "./routes/admin-access";
import { SandboxRunStore } from "./sandbox/sandbox-runner";
import { registerSandboxRoutes } from "./routes/sandbox";
import { AnalystNoteService } from "./collaboration/analyst-note-service";
import { registerCollaborationRoutes } from "./routes/collaboration";

export interface CreateAppOptions {
  dataDir?: string;
  logger?: boolean;
  provider?: CyberModelProvider;
  authRequired?: boolean;
}

function statusCodeFromError(error: unknown): number {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    if (typeof statusCode === "number") {
      return statusCode;
    }
  }

  return 500;
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected server error.";
}

export async function createApp(options: CreateAppOptions = {}): Promise<FastifyInstance> {
  const app = fastify({
    logger: options.logger ?? false
  });

  const dataDir = resolveDataDir(options.dataDir);
  await ensureDataDirs(dataDir);

  const caseService = new CaseService(dataDir);
  const auditEventService = new AuditEventService(dataDir);
  const auditService = new AuditService(dataDir, auditEventService);
  const governanceExportService = new GovernanceExportService(auditEventService);
  const knowledgeService = new KnowledgeService(dataDir);
  const validationService = new ValidationService(dataDir);
  const vulnerabilityService = new VulnerabilityService(dataDir);
  const cloudSecurityService = new CloudSecurityService(dataDir);
  const threatIntelService = new ThreatIntelService(dataDir);
  const authService = new AuthService(dataDir);
  const authorizationPolicyEngine = new AuthorizationPolicyEngine(dataDir);
  const breakGlassService = new BreakGlassService(dataDir);
  const serviceAccountService = new ServiceAccountService(dataDir);
  const tenantService = new TenantService(dataDir);
  const sandboxRunStore = new SandboxRunStore(dataDir);
  const analystNoteService = new AnalystNoteService(dataDir);
  const jobQueue = new InMemoryJobQueue();
  const metricsService = new MetricsService();
  const errorReporter = new ErrorReporter();
  const storageAdapter = createLocalJsonStorageAdapter(dataDir);
  const provider = options.provider ?? createProvider();
  const usageAccountingService = new UsageAccountingService();
  const evidenceSourceRegistry = new EvidenceSourceRegistry();
  const ingestionJobService = new IngestionJobService(evidenceSourceRegistry);
  const healthService = new HealthService(provider, storageAdapter);
  const pipeline = new AnalyzePipeline(
    caseService,
    auditService,
    provider,
    knowledgeService,
    threatIntelService,
    metricsService,
    usageAccountingService
  );

  await app.register(cors, {
    origin: true
  });
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 5
    }
  });

  registerRequestContext(app);
  app.addHook("onResponse", async (request, reply) => {
    metricsService.increment("http_requests_total", {
      method: request.method,
      status: String(reply.statusCode)
    });
  });
  registerDevAuthMiddleware(app, {
    authService,
    authorizationPolicyEngine,
    breakGlassService,
    caseService,
    required: options.authRequired ?? process.env.AUTH_REQUIRED === "true"
  });

  registerHealthRoutes(app);
  registerAuthRoutes(app, {
    authRequired: options.authRequired ?? process.env.AUTH_REQUIRED === "true",
    auditService,
    authService,
    caseService
  });
  registerAdminAccessRoutes(app, {
    auditService,
    authorizationPolicyEngine,
    breakGlassService,
    serviceAccountService,
    tenantService
  });
  registerSandboxRoutes(app, { auditService, sandboxRunStore });
  registerAnalyzeRoutes(app, { pipeline });
  registerCaseRoutes(app, { auditService, caseService });
  registerCollaborationRoutes(app, { analystNoteService, auditService, caseService });
  registerWorkflowRoutes(app, { auditService, caseService });
  registerKnowledgeRoutes(app, { knowledgeService });
  registerToolRoutes(app, { auditService, caseService });
  registerActionRoutes(app, { auditService, caseService });
  registerDetectionRoutes(app, { auditService, caseService });
  registerReportRoutes(app, { auditService, caseService });
  registerSafetyRoutes(app, { auditService, caseService });
  registerValidationRoutes(app, { auditService, validationService });
  registerVulnerabilityRoutes(app, { auditService, vulnerabilityService });
  registerCloudSecurityRoutes(app, { auditService, caseService, cloudSecurityService });
  registerEndpointRoutes(app, { auditService, caseService });
  registerThreatIntelRoutes(app, { auditService, caseService, threatIntelService });
  registerAgentRoutes(app, { auditService, caseService });
  registerAuditRoutes(app, { auditService, auditEventService, governanceExportService });
  registerPrivacyRoutes(app, { auditService, caseService });
  registerSearchRoutes(app, { caseService });
  registerJobRoutes(app, { jobQueue });
  registerObservabilityRoutes(app, { errorReporter, healthService, jobQueue, metricsService });
  registerProviderRoutes(app, { caseService, provider, usageAccountingService });
  registerConnectorRoutes(app, { auditService, caseService });
  registerIngestionRoutes(app, {
    auditService,
    caseService,
    sourceRegistry: evidenceSourceRegistry,
    ingestionJobService
  });
  registerMalwareForensicsRoutes(app, { auditService, caseService });
  registerDocsRoutes(app);

  app.setErrorHandler((error, _request, reply) => {
    errorReporter.report({
      error,
      component: "api",
      requestId: getRequestId(_request)
    });
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: "validation_error",
        issues: error.issues
      });
    }

    const statusCode = statusCodeFromError(error);
    return reply.code(statusCode).send({
      error: statusCode >= 500 ? "internal_server_error" : "request_error",
      message: messageFromError(error)
    });
  });

  return app;
}
