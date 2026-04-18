import { FormEvent, useState } from "react";
import type { AnalysisMode } from "../types";

interface IntakePanelProps {
  loading: boolean;
  onAnalyzeText: (input: { mode: AnalysisMode; title?: string; text: string }) => Promise<void>;
  onAnalyzeFile: (input: { mode: AnalysisMode; title?: string; file: File }) => Promise<void>;
}

const examples: Record<AnalysisMode, string> = {
  alert:
    '{"timestamp":"2026-04-16T10:15:00Z","host":"WS-42","eventId":4688,"commandLine":"powershell.exe -EncodedCommand SQBFAFgA...","user":"CORP\\\\j.smith"}',
  logs:
    "2026-04-16T10:00:00Z failed login user=admin src=203.0.113.10\n2026-04-16T10:01:00Z failed login user=admin src=203.0.113.10\n2026-04-16T10:02:00Z successful login user=admin src=203.0.113.10",
  iocs: "203.0.113.10\nhttps://example-threat.test/login\n44d88612fea8a8f36de82e1278abb02f",
  hardening: "How do I harden IIS on a Windows Server?"
};

export function IntakePanel({ loading, onAnalyzeText, onAnalyzeFile }: IntakePanelProps): JSX.Element {
  const [mode, setMode] = useState<AnalysisMode>("alert");
  const [title, setTitle] = useState("");
  const [text, setText] = useState(examples.alert);
  const [file, setFile] = useState<File | null>(null);

  function updateMode(nextMode: AnalysisMode): void {
    setMode(nextMode);
    setText(examples[nextMode]);
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (file) {
      await onAnalyzeFile({ mode, title: title || undefined, file });
      setFile(null);
      return;
    }

    await onAnalyzeText({ mode, title: title || undefined, text });
  }

  return (
    <section className="intake-panel">
      <div className="section-heading">
        <p className="eyebrow">Intake</p>
        <h2>Defensive Review</h2>
      </div>

      <form onSubmit={submit}>
        <label>
          Mode
          <select value={mode} onChange={(event) => updateMode(event.target.value as AnalysisMode)}>
            <option value="alert">Alert triage</option>
            <option value="logs">Log summary</option>
            <option value="iocs">IOC review</option>
            <option value="hardening">Hardening</option>
          </select>
        </label>

        <label>
          Case title
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Optional title" />
        </label>

        <label>
          Input
          <textarea value={text} onChange={(event) => setText(event.target.value)} rows={14} />
        </label>

        <label>
          Upload .log, .txt, .json, or .csv
          <input
            type="file"
            accept=".log,.txt,.json,.csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <button className="primary-button" type="submit" disabled={loading || (!text.trim() && !file)}>
          {loading ? "Analyzing" : "Analyze"}
        </button>
      </form>
    </section>
  );
}
