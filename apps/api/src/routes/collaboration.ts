import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AnalystNoteService } from "../collaboration/analyst-note-service";
import { createAnalystNoteSchema } from "../schemas/collaboration.schema";
import type { AuditService } from "../services/audit-service";
import type { CaseService } from "../services/case-service";
import { nowIso } from "../utils/time";

interface CollaborationRouteDeps {
  analystNoteService: AnalystNoteService;
  auditService: AuditService;
  caseService: CaseService;
}

const caseParamsSchema = z.object({
  id: z.string().min(1)
});

export function registerCollaborationRoutes(app: FastifyInstance, deps: CollaborationRouteDeps): void {
  app.get("/cases/:id/notes", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    return {
      notes: await deps.analystNoteService.listNotes(params.id)
    };
  });

  app.post("/cases/:id/notes", async (request, reply) => {
    const params = caseParamsSchema.parse(request.params);
    const input = createAnalystNoteSchema.parse(request.body);
    const cyberCase = await deps.caseService.getCase(params.id);
    if (!cyberCase) {
      return reply.code(404).send({ error: "case_not_found" });
    }

    const note = await deps.analystNoteService.createNote(params.id, input);
    const audit = await deps.auditService.record({
      caseId: params.id,
      action: "collaboration.note_created",
      summary: `Analyst note created by ${note.author}.`,
      allowed: true,
      metadata: {
        noteId: note.id,
        mentions: note.mentions,
        visibility: note.visibility,
        redacted: note.redacted
      }
    });
    const savedNote = {
      ...note,
      auditEntryId: audit.id,
      updatedAt: nowIso()
    };
    const notes = await deps.analystNoteService.listNotes(params.id);
    await deps.analystNoteService.saveNotes(
      params.id,
      notes.map((candidate) => (candidate.id === savedNote.id ? savedNote : candidate))
    );
    cyberCase.analystNotes.push(savedNote);
    cyberCase.auditEntries.push(audit);
    cyberCase.updatedAt = nowIso();
    await deps.caseService.saveCase(cyberCase);

    return {
      note: savedNote,
      notes: cyberCase.analystNotes,
      case: cyberCase
    };
  });
}
