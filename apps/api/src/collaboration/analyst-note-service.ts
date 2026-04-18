import path from "node:path";
import type { AnalystNote, CreateAnalystNoteInput } from "../schemas/collaboration.schema";
import { analystNoteSchema, createAnalystNoteSchema } from "../schemas/collaboration.schema";
import { detectSensitiveData } from "../privacy/sensitive-data-detector";
import { applyRedactions } from "../privacy/redaction-service";
import { ensureDir, readJsonFile, writeJsonFile } from "../utils/files";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export class AnalystNoteService {
  constructor(private readonly dataDir: string) {}

  private notePath(caseId: string): string {
    return path.join(this.dataDir, "collaboration", "notes", `${caseId}.json`);
  }

  async listNotes(caseId: string): Promise<AnalystNote[]> {
    try {
      return (await readJsonFile<AnalystNote[]>(this.notePath(caseId))).map((note) => analystNoteSchema.parse(note));
    } catch {
      return [];
    }
  }

  async saveNotes(caseId: string, notes: AnalystNote[]): Promise<void> {
    await ensureDir(path.dirname(this.notePath(caseId)));
    await writeJsonFile(this.notePath(caseId), notes.map((note) => analystNoteSchema.parse(note)));
  }

  async createNote(caseId: string, input: CreateAnalystNoteInput): Promise<AnalystNote> {
    const parsed = createAnalystNoteSchema.parse(input);
    const findings = detectSensitiveData(parsed.text, `case:${caseId}:analyst_note`);
    const timestamp = nowIso();
    const note = analystNoteSchema.parse({
      id: createId("analyst_note"),
      caseId,
      author: parsed.author,
      text: findings.length > 0 ? applyRedactions(parsed.text, findings) : parsed.text,
      mentions: parsed.mentions,
      visibility: parsed.visibility,
      reviewStatus: parsed.reviewStatus,
      redacted: findings.length > 0,
      createdAt: timestamp,
      updatedAt: timestamp
    });
    const notes = await this.listNotes(caseId);
    await this.saveNotes(caseId, [...notes, note]);
    return note;
  }
}
