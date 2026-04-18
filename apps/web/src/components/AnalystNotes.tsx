import { FormEvent, useState } from "react";
import type { AnalystNote } from "../types";

interface AnalystNotesProps {
  busy?: boolean;
  notes: AnalystNote[];
  onCreate: (input: { author: string; text: string; mentions: string[]; visibility: AnalystNote["visibility"] }) => Promise<void>;
}

export function AnalystNotes({ busy = false, notes, onCreate }: AnalystNotesProps): JSX.Element {
  const [author, setAuthor] = useState("analyst");
  const [text, setText] = useState("");
  const [mentions, setMentions] = useState("");
  const [visibility, setVisibility] = useState<AnalystNote["visibility"]>("case");

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await onCreate({
      author,
      text,
      mentions: mentions
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      visibility
    });
    setText("");
    setMentions("");
  }

  return (
    <section className="workspace-section analyst-notes">
      <h3>Analyst Notes</h3>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label>
            Author
            <input value={author} onChange={(event) => setAuthor(event.target.value)} />
          </label>
          <label>
            Visibility
            <select value={visibility} onChange={(event) => setVisibility(event.target.value as AnalystNote["visibility"])}>
              <option value="case">case</option>
              <option value="tenant">tenant</option>
              <option value="private">private</option>
            </select>
          </label>
        </div>
        <label>
          Mentions
          <input value={mentions} onChange={(event) => setMentions(event.target.value)} placeholder="lead, responder" />
        </label>
        <label>
          Note
          <textarea value={text} onChange={(event) => setText(event.target.value)} rows={5} />
        </label>
        <button className="primary-button" type="submit" disabled={busy || !text.trim()}>
          Add Note
        </button>
      </form>

      <ol className="audit-list note-list">
        {notes.length === 0 ? (
          <li>
            <p className="muted">No analyst notes yet.</p>
          </li>
        ) : (
          notes.map((note) => (
            <li key={note.id}>
              <div>
                <strong>{note.author}</strong>
                <span>{note.reviewStatus}</span>
              </div>
              <p>{note.text}</p>
              <small>
                {note.visibility} · {new Date(note.createdAt).toLocaleString()}
                {note.redacted ? " · redacted" : ""}
              </small>
            </li>
          ))
        )}
      </ol>
    </section>
  );
}
