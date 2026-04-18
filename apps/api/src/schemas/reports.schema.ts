import { z } from "zod";

export const reportAudienceSchema = z.enum(["executive", "technical", "external"]);
export const reportStatusSchema = z.enum(["draft", "in_review", "approved"]);

export const reportSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  required: z.boolean(),
  guidance: z.string().optional()
});

export const reportFieldRuleSchema = z.object({
  sectionId: z.string(),
  required: z.boolean().default(true),
  maxLength: z.number().int().positive().optional(),
  redactForAudiences: z.array(reportAudienceSchema).default([])
});

export const reportTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  audience: reportAudienceSchema,
  requiredSections: z.array(z.string()),
  sections: z.array(reportSectionSchema),
  fieldRules: z.array(reportFieldRuleSchema).default([])
});

export const reportCitationSchema = z.object({
  id: z.string(),
  reportId: z.string(),
  claimId: z.string(),
  sourceRef: z.string(),
  observationId: z.string().optional(),
  findingId: z.string().optional(),
  confidence: z.number().min(0).max(1)
});

export const reportDraftSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  templateId: z.string(),
  audience: reportAudienceSchema,
  title: z.string(),
  contentMarkdown: z.string(),
  citations: z.array(reportCitationSchema).default([]),
  status: reportStatusSchema,
  createdBy: z.string(),
  updatedBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const reportVersionSchema = z.object({
  id: z.string(),
  draftId: z.string(),
  version: z.number().int().positive(),
  editor: z.string(),
  diffSummary: z.string(),
  contentMarkdown: z.string(),
  timestamp: z.string()
});

export const redactedFieldSchema = z.object({
  fieldType: z.enum(["ipv4", "ipv6", "email", "username", "secret"]),
  count: z.number().int().nonnegative(),
  replacement: z.string()
});

export const redactionResultSchema = z.object({
  id: z.string(),
  reportId: z.string(),
  audience: reportAudienceSchema,
  redactedMarkdown: z.string(),
  redactedFields: z.array(redactedFieldSchema),
  warnings: z.array(z.string()).default([]),
  createdAt: z.string()
});

export type ReportAudience = z.infer<typeof reportAudienceSchema>;
export type ReportStatus = z.infer<typeof reportStatusSchema>;
export type ReportSection = z.infer<typeof reportSectionSchema>;
export type ReportFieldRule = z.infer<typeof reportFieldRuleSchema>;
export type ReportTemplate = z.infer<typeof reportTemplateSchema>;
export type ReportCitation = z.infer<typeof reportCitationSchema>;
export type ReportDraft = z.infer<typeof reportDraftSchema>;
export type ReportVersion = z.infer<typeof reportVersionSchema>;
export type RedactedField = z.infer<typeof redactedFieldSchema>;
export type RedactionResult = z.infer<typeof redactionResultSchema>;
