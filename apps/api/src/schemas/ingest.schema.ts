import { z } from "zod";

const ingestSeveritySchema = z.enum(["low", "medium", "high", "critical"]);

export const uploadedInputFileSchema = z.object({
  filename: z.string(),
  mediaType: z.string().optional(),
  text: z.string(),
  json: z.unknown().optional()
});

export const ingestSourceRefSchema = z.object({
  artifactId: z.string(),
  parserId: z.string(),
  lineNumber: z.number().int().positive().optional(),
  jsonPointer: z.string().optional(),
  byteRange: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]).optional(),
  excerpt: z.string().optional()
});

export const uploadedArtifactSchema = z.object({
  id: z.string(),
  filename: z.string(),
  mediaType: z.string(),
  hash: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  storageRef: z.string(),
  source: z.enum(["inline", "upload"]),
  createdAt: z.string()
});

export const entitySchema = z.object({
  id: z.string(),
  type: z.enum(["host", "user", "ip", "domain", "process", "file", "cloud_identity", "container"]),
  value: z.string(),
  normalized: z.string(),
  aliases: z.array(z.string()).default([])
});

export const normalizedEventSchema = z.object({
  id: z.string(),
  timestamp: z.string().optional(),
  source: z.string(),
  eventType: z.string(),
  severity: ingestSeveritySchema,
  actor: z.string().optional(),
  asset: z.string().optional(),
  network: z
    .object({
      srcIp: z.string().optional(),
      dstIp: z.string().optional(),
      srcPort: z.string().optional(),
      dstPort: z.string().optional()
    })
    .default({}),
  process: z
    .object({
      image: z.string().optional(),
      parentImage: z.string().optional(),
      commandLine: z.string().optional()
    })
    .default({}),
  entityIds: z.array(z.string()).default([]),
  rawRef: ingestSourceRefSchema
});

export const parserWarningSchema = z.object({
  parserId: z.string(),
  sourceRef: ingestSourceRefSchema,
  message: z.string(),
  severity: z.enum(["info", "warning", "error"])
});

export const ingestionBundleSchema = z.object({
  artifacts: z.array(uploadedArtifactSchema),
  normalizedEvents: z.array(normalizedEventSchema),
  entities: z.array(entitySchema),
  parserWarnings: z.array(parserWarningSchema)
});

export type UploadedInputFile = z.infer<typeof uploadedInputFileSchema>;
export type IngestSourceRef = z.infer<typeof ingestSourceRefSchema>;
export type UploadedArtifact = z.infer<typeof uploadedArtifactSchema>;
export type Entity = z.infer<typeof entitySchema>;
export type NormalizedEvent = z.infer<typeof normalizedEventSchema>;
export type ParserWarning = z.infer<typeof parserWarningSchema>;
export type IngestionBundle = z.infer<typeof ingestionBundleSchema>;
