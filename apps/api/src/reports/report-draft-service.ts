import type { CyberCase } from "../schemas/case.schema";
import type { ReportCitation, ReportDraft, ReportStatus, ReportTemplate, ReportVersion } from "../schemas/reports.schema";
import { renderReportFromTemplate } from "../services/report-service";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export interface CreateReportDraftInput {
  template: ReportTemplate;
  actor?: string;
}

export interface UpdateReportDraftInput {
  contentMarkdown?: string;
  status?: ReportStatus;
  editor?: string;
  diffSummary?: string;
}

function buildFindingCitations(cyberCase: CyberCase, reportId: string): ReportCitation[] {
  const reasoning = cyberCase.result?.reasoning;
  if (!reasoning || reasoning.findings.length === 0) {
    return [];
  }

  return reasoning.findings.flatMap((finding) => {
    const observationIds = finding.evidenceObservationIds.length > 0 ? finding.evidenceObservationIds : [];
    if (observationIds.length === 0) {
      return [
        {
          id: createId("report_citation"),
          reportId,
          claimId: finding.id,
          sourceRef: `finding:${finding.id}`,
          findingId: finding.id,
          confidence: finding.confidence
        }
      ];
    }

    return observationIds.map((observationId, observationIndex) => ({
      id: createId("report_citation"),
      reportId,
      claimId: `${finding.id}:${observationIndex + 1}`,
      sourceRef: `observation:${observationId}`,
      observationId,
      findingId: finding.id,
      confidence: finding.confidence
    }));
  });
}

function buildEvidenceCitations(cyberCase: CyberCase, reportId: string): ReportCitation[] {
  const evidence = cyberCase.result?.evidence ?? [];
  return evidence.map((_item, index) => ({
    id: createId("report_citation"),
    reportId,
    claimId: `evidence-${index + 1}`,
    sourceRef: `evidence:${index + 1}`,
    confidence: cyberCase.result?.confidence ?? 0.5
  }));
}

export function createReportDraft(
  cyberCase: CyberCase,
  input: CreateReportDraftInput
): { draft: ReportDraft; version: ReportVersion; citations: ReportCitation[] } {
  if (!cyberCase.result) {
    throw new Error("case_has_no_analysis_result");
  }

  const now = nowIso();
  const reportId = createId("report");
  const findingCitations = buildFindingCitations(cyberCase, reportId);
  const citations = findingCitations.length > 0 ? findingCitations : buildEvidenceCitations(cyberCase, reportId);
  const contentMarkdown = renderReportFromTemplate(cyberCase.result, input.template);
  const actor = input.actor ?? "system";
  const draft: ReportDraft = {
    id: reportId,
    caseId: cyberCase.id,
    templateId: input.template.id,
    audience: input.template.audience,
    title: `${input.template.name}: ${cyberCase.title}`,
    contentMarkdown,
    citations,
    status: "draft",
    createdBy: actor,
    createdAt: now,
    updatedAt: now
  };
  const version: ReportVersion = {
    id: createId("report_version"),
    draftId: reportId,
    version: 1,
    editor: actor,
    diffSummary: "Initial draft generated from case analysis.",
    contentMarkdown,
    timestamp: now
  };

  return {
    draft,
    version,
    citations
  };
}

export function updateReportDraft(
  cyberCase: CyberCase,
  reportId: string,
  input: UpdateReportDraftInput
): { draft: ReportDraft; version: ReportVersion } | null {
  const draftIndex = cyberCase.reportDrafts.findIndex((draft) => draft.id === reportId);
  if (draftIndex === -1) {
    return null;
  }

  const current = cyberCase.reportDrafts[draftIndex];
  const now = nowIso();
  const editor = input.editor ?? "analyst";
  const nextContent = input.contentMarkdown ?? current.contentMarkdown;
  const nextStatus = input.status ?? current.status;
  const nextVersion =
    cyberCase.reportVersions.filter((version) => version.draftId === reportId).reduce((max, version) => Math.max(max, version.version), 0) + 1;

  const draft: ReportDraft = {
    ...current,
    contentMarkdown: nextContent,
    status: nextStatus,
    updatedBy: editor,
    updatedAt: now
  };
  const version: ReportVersion = {
    id: createId("report_version"),
    draftId: reportId,
    version: nextVersion,
    editor,
    diffSummary: input.diffSummary ?? (input.status ? `Status changed to ${input.status}.` : "Report content updated."),
    contentMarkdown: nextContent,
    timestamp: now
  };

  cyberCase.reportDrafts[draftIndex] = draft;

  return {
    draft,
    version
  };
}
