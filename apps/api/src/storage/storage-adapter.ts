import type { AuditEvent } from "../schemas/audit.schema";
import type { CaseListItem, CyberCase } from "../schemas/case.schema";

export interface CaseRepository {
  save(cyberCase: CyberCase): Promise<CyberCase>;
  get(caseId: string): Promise<CyberCase | null>;
  list(): Promise<CaseListItem[]>;
  search(query: string): Promise<CaseListItem[]>;
}

export interface AuditRepository {
  append(event: AuditEvent): Promise<AuditEvent>;
  list(filters?: { caseId?: string; limit?: number }): Promise<AuditEvent[]>;
}

export interface ArtifactRepository {
  put(ref: string, content: string): Promise<{ ref: string; sizeBytes: number }>;
  get(ref: string): Promise<string | null>;
}

export interface StorageAdapter {
  kind: string;
  cases: CaseRepository;
  audits: AuditRepository;
  artifacts: ArtifactRepository;
}
