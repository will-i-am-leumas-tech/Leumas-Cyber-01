import { z } from "zod";

export const forensicArtifactTypeSchema = z.enum([
  "process_logs",
  "script_block_logs",
  "prefetch",
  "edr_alert",
  "network_connection",
  "user_session",
  "file_hash",
  "registry_snapshot"
]);

export const endpointEventSchema = z.object({
  id: z.string(),
  caseId: z.string().optional(),
  host: z.string(),
  user: z.string().optional(),
  timestamp: z.string(),
  eventType: z.string(),
  processGuid: z.string(),
  image: z.string(),
  commandLine: z.string().optional(),
  parentProcessGuid: z.string().optional(),
  parentImage: z.string().optional(),
  file: z.string().optional(),
  registry: z.string().optional(),
  network: z
    .object({
      srcIp: z.string().optional(),
      dstIp: z.string().optional(),
      dstPort: z.string().optional()
    })
    .default({}),
  sourceRef: z.string(),
  riskSignals: z.array(z.string()).default([])
});

export interface ProcessNode {
  processGuid: string;
  image: string;
  commandLine?: string;
  parentGuid?: string;
  eventIds: string[];
  riskSignals: string[];
  children: ProcessNode[];
}

export const processNodeSchema: z.ZodType<ProcessNode> = z.lazy(() =>
  z.object({
    processGuid: z.string(),
    image: z.string(),
    commandLine: z.string().optional(),
    parentGuid: z.string().optional(),
    eventIds: z.array(z.string()),
    riskSignals: z.array(z.string()),
    children: z.array(processNodeSchema)
  })
);

export const processTreeSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  host: z.string(),
  roots: z.array(processNodeSchema),
  warnings: z.array(z.string()).default([]),
  createdAt: z.string()
});

export const forensicArtifactSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  type: forensicArtifactTypeSchema,
  source: z.string(),
  collected: z.boolean(),
  hash: z.string().optional(),
  storageRef: z.string().optional(),
  chainOfCustody: z.array(z.string()).default([])
});

export const forensicTimelineEventSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  timestamp: z.string(),
  host: z.string(),
  actor: z.string().optional(),
  eventType: z.string(),
  sourceRef: z.string(),
  processGuid: z.string().optional(),
  summary: z.string()
});

export const sampleAnalysisSummarySchema = z.object({
  id: z.string(),
  caseId: z.string(),
  hashes: z.array(z.string()).default([]),
  observedBehavior: z.array(z.string()),
  detections: z.array(z.string()),
  safeRemediationGuidance: z.array(z.string()),
  createdAt: z.string()
});

export const endpointEventsImportSchema = z
  .object({
    text: z.string().optional(),
    events: z.array(z.unknown()).optional()
  })
  .refine((value) => Boolean(value.text?.trim()) || (value.events?.length ?? 0) > 0, {
    message: "text or events are required",
    path: ["text"]
  });

export const forensicArtifactInputSchema = z.object({
  type: forensicArtifactTypeSchema,
  source: z.string().min(1),
  collected: z.boolean().default(false),
  hash: z.string().optional(),
  storageRef: z.string().optional(),
  chainOfCustody: z.array(z.string()).default([])
});

export const forensicArtifactsBodySchema = z
  .object({
    artifacts: z.array(forensicArtifactInputSchema).optional()
  })
  .default({});

export type ForensicArtifactType = z.infer<typeof forensicArtifactTypeSchema>;
export type EndpointEvent = z.infer<typeof endpointEventSchema>;
export type ProcessTree = z.infer<typeof processTreeSchema>;
export type ForensicArtifact = z.infer<typeof forensicArtifactSchema>;
export type ForensicTimelineEvent = z.infer<typeof forensicTimelineEventSchema>;
export type SampleAnalysisSummary = z.infer<typeof sampleAnalysisSummarySchema>;
export type EndpointEventsImportInput = z.infer<typeof endpointEventsImportSchema>;
export type ForensicArtifactInput = z.infer<typeof forensicArtifactInputSchema>;
