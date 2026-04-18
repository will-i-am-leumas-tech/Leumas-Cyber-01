import { FormEvent, useEffect, useMemo, useState } from "react";
import type { CyberCase, ReportAudience, ReportStatus } from "../types";
import { activeReportDraft } from "../workspace/view-model";

interface ReportEditorProps {
  cyberCase: CyberCase;
  busy?: boolean;
  onCreateDraft: (templateId?: string) => Promise<void>;
  onSaveDraft: (reportId: string, input: { contentMarkdown: string; status: ReportStatus; diffSummary: string }) => Promise<void>;
  onCreateRedaction: (reportId: string, audience: ReportAudience) => Promise<void>;
}

const statusOptions: ReportStatus[] = ["draft", "in_review", "approved"];

export function ReportEditor({
  cyberCase,
  busy = false,
  onCreateDraft,
  onSaveDraft,
  onCreateRedaction
}: ReportEditorProps): JSX.Element {
  const latestDraft = useMemo(() => activeReportDraft(cyberCase), [cyberCase]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | undefined>(latestDraft?.id);
  const selectedDraft = cyberCase.reportDrafts.find((draft) => draft.id === selectedDraftId) ?? latestDraft;
  const [content, setContent] = useState(selectedDraft?.contentMarkdown ?? cyberCase.reportMarkdown);
  const [status, setStatus] = useState<ReportStatus>(selectedDraft?.status ?? "draft");
  const [diffSummary, setDiffSummary] = useState("Analyst report update.");

  useEffect(() => {
    setSelectedDraftId(latestDraft?.id);
    setContent(latestDraft?.contentMarkdown ?? cyberCase.reportMarkdown);
    setStatus(latestDraft?.status ?? "draft");
  }, [cyberCase.id, cyberCase.reportMarkdown, latestDraft]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selectedDraft) {
      await onCreateDraft("technical-template");
      return;
    }

    await onSaveDraft(selectedDraft.id, {
      contentMarkdown: content,
      status,
      diffSummary
    });
  }

  return (
    <div className="report-editor">
      <div className="report-toolbar">
        <label>
          Draft
          <select value={selectedDraft?.id ?? ""} onChange={(event) => setSelectedDraftId(event.target.value || undefined)}>
            {cyberCase.reportDrafts.length === 0 ? (
              <option value="">Generated report</option>
            ) : (
              cyberCase.reportDrafts.map((draft) => (
                <option key={draft.id} value={draft.id}>
                  {draft.title}
                </option>
              ))
            )}
          </select>
        </label>
        <label>
          Status
          <select value={status} disabled={!selectedDraft} onChange={(event) => setStatus(event.target.value as ReportStatus)}>
            {statusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <form onSubmit={submit}>
        <label>
          Diff summary
          <input value={diffSummary} disabled={!selectedDraft} onChange={(event) => setDiffSummary(event.target.value)} />
        </label>
        <label>
          Markdown
          <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={18} />
        </label>
        <div className="button-row">
          <button className="primary-button" type="submit" disabled={busy || !content.trim()}>
            {selectedDraft ? "Save Report" : "Create Draft"}
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={busy || !selectedDraft}
            onClick={() => {
              if (selectedDraft) {
                void onCreateRedaction(selectedDraft.id, "external");
              }
            }}
          >
            Redaction Preview
          </button>
        </div>
      </form>

      <div className="report-quality-strip">
        <span>{selectedDraft?.citations.length ?? cyberCase.reportCitations.length} citations</span>
        <span>{cyberCase.reportVersions.length} versions</span>
        <span>{cyberCase.redactionResults.length} redaction previews</span>
      </div>
    </div>
  );
}
