import path from "node:path";
import {
  ingestKnowledgeSourceSchema,
  knowledgeChunkSchema,
  knowledgeSourceSchema,
  retrievalQuerySchema,
  type IngestKnowledgeSourceInput,
  type KnowledgeChunk,
  type KnowledgeContext,
  type KnowledgeSource,
  type RetrievalQuery,
  type RetrievalResult,
  type RetrievalSnapshot
} from "../schemas/knowledge.schema";
import type { CitationQuality, KnowledgeApproval, PatchKnowledgeApprovalInput, TaxonomyMapping } from "../schemas/knowledge-v2.schema";
import { ensureDir, listJsonFiles, readJsonFile, writeJsonFile } from "../utils/files";
import { nowIso } from "../utils/time";
import { sha256Text } from "../reasoning/hash";
import { chunkKnowledgeDocument } from "./chunker";
import { scoreCitationQuality } from "./citation-quality-scorer";
import { freshnessStatus } from "./source-freshness-service";
import { hybridRetrieveKnowledge } from "./hybrid-retriever";
import { buildKnowledgeApproval, classifyKnowledgeApproval } from "./knowledge-approval-service";
import { sourceRecordFromKnowledgeSource } from "./source-registry";
import { mapKnowledgeTaxonomy } from "./taxonomy-mapper";

export class KnowledgeService {
  constructor(private readonly dataDir: string) {}

  private sourcePath(sourceId: string): string {
    return path.join(this.dataDir, "knowledge", "sources", `${sourceId}.json`);
  }

  private chunkPath(sourceId: string): string {
    return path.join(this.dataDir, "knowledge", "chunks", `${sourceId}.json`);
  }

  private snapshotPath(caseId: string): string {
    return path.join(this.dataDir, "knowledge", "snapshots", `${caseId}.json`);
  }

  private approvalPath(sourceId: string): string {
    return path.join(this.dataDir, "knowledge", "approvals", `${sourceId}.json`);
  }

  async ingestSource(rawInput: IngestKnowledgeSourceInput): Promise<{ source: KnowledgeSource; chunks: KnowledgeChunk[] }> {
    const input = ingestKnowledgeSourceSchema.parse(rawInput);
    const hash = sha256Text(`${input.title}\n${input.uri}\n${input.version}\n${input.text}`);
    const sourceId = `source_${hash.slice(0, 16)}`;
    const source: KnowledgeSource = {
      id: sourceId,
      title: input.title,
      uri: input.uri,
      type: input.type,
      trustTier: input.trustTier,
      owner: input.owner,
      tenantId: input.tenantId,
      approvalState: classifyKnowledgeApproval(input.text, input.approvalState),
      taxonomyTags: input.taxonomyTags,
      version: input.version,
      reviewAt: input.reviewAt,
      createdAt: nowIso(),
      hash
    };
    const chunks = chunkKnowledgeDocument({
      sourceId,
      title: source.title,
      text: input.text,
      type: input.type
    }).map((chunk) => knowledgeChunkSchema.parse(chunk));

    await ensureDir(path.dirname(this.sourcePath(source.id)));
    await writeJsonFile(this.sourcePath(source.id), knowledgeSourceSchema.parse(source));
    await writeJsonFile(this.chunkPath(source.id), chunks);

    return { source, chunks };
  }

  async listSources(): Promise<KnowledgeSource[]> {
    const files = await listJsonFiles(path.join(this.dataDir, "knowledge", "sources"));
    const sources = await Promise.all(files.map(async (file) => knowledgeSourceSchema.parse(await readJsonFile<KnowledgeSource>(file))));
    return sources.sort((a, b) => a.title.localeCompare(b.title));
  }

  async listChunks(): Promise<KnowledgeChunk[]> {
    const files = await listJsonFiles(path.join(this.dataDir, "knowledge", "chunks"));
    const chunks = await Promise.all(
      files.map(async (file) => {
        const parsed = await readJsonFile<KnowledgeChunk[]>(file);
        return parsed.map((chunk) => knowledgeChunkSchema.parse(chunk));
      })
    );
    return chunks.flat();
  }

  async search(rawQuery: RetrievalQuery): Promise<RetrievalResult[]> {
    const query = retrievalQuerySchema.parse(rawQuery);
    const [sources, chunks] = await Promise.all([this.listSources(), this.listChunks()]);
    return hybridRetrieveKnowledge({ query, sources, chunks });
  }

  async listSourceRecords() {
    return (await this.listSources()).map(sourceRecordFromKnowledgeSource);
  }

  async listApprovals(sourceId: string): Promise<KnowledgeApproval[]> {
    try {
      return await readJsonFile<KnowledgeApproval[]>(this.approvalPath(sourceId));
    } catch {
      return [];
    }
  }

  async updateSourceApproval(sourceId: string, input: PatchKnowledgeApprovalInput): Promise<{
    source: KnowledgeSource;
    approval: KnowledgeApproval;
  } | null> {
    const source = (await this.listSources()).find((candidate) => candidate.id === sourceId);
    if (!source) {
      return null;
    }
    const nextStatus = source.approvalState === "quarantined" && input.status === "approved" ? "quarantined" : input.status;
    const approval = buildKnowledgeApproval(sourceId, {
      ...input,
      status: nextStatus,
      reason:
        nextStatus === input.status
          ? input.reason
          : `${input.reason} Source remains quarantined until the unsafe content is removed and re-ingested.`
    });
    const updated = knowledgeSourceSchema.parse({
      ...source,
      approvalState: nextStatus,
      reviewAt: nextStatus === "approved" ? source.reviewAt : nowIso()
    });
    await writeJsonFile(this.sourcePath(sourceId), updated);
    const approvals = await this.listApprovals(sourceId);
    await writeJsonFile(this.approvalPath(sourceId), [...approvals, approval]);
    return { source: updated, approval };
  }

  async getFreshness(sourceId: string) {
    const source = (await this.listSources()).find((candidate) => candidate.id === sourceId);
    return source ? { source, freshness: freshnessStatus(source) } : null;
  }

  async getCitationQuality(chunkId: string): Promise<CitationQuality | null> {
    const [sources, chunks] = await Promise.all([this.listSources(), this.listChunks()]);
    const chunk = chunks.find((candidate) => candidate.id === chunkId);
    const source = chunk ? sources.find((candidate) => candidate.id === chunk.sourceId) : undefined;
    if (!chunk || !source) {
      return null;
    }
    return scoreCitationQuality(
      {
        chunkId: chunk.id,
        score: 1,
        excerpt: chunk.text.slice(0, 360),
        citation: {
          sourceId: source.id,
          title: source.title,
          uri: source.uri,
          location: chunk.location,
          trustTier: source.trustTier,
          version: source.version,
          reviewAt: source.reviewAt,
          stale: freshnessStatus(source).stale
        }
      },
      source
    );
  }

  async listTaxonomyMappings(sourceId: string): Promise<TaxonomyMapping[]> {
    const [sources, chunks] = await Promise.all([this.listSources(), this.listChunks()]);
    const source = sources.find((candidate) => candidate.id === sourceId);
    if (!source) {
      return [];
    }
    return [...mapKnowledgeTaxonomy(source), ...chunks.filter((chunk) => chunk.sourceId === sourceId).flatMap(mapKnowledgeTaxonomy)];
  }

  async createSnapshot(input: {
    caseId: string;
    query: string;
    results: RetrievalResult[];
    promptIncluded: boolean;
  }): Promise<RetrievalSnapshot> {
    const existing = await this.listSnapshots(input.caseId);
    const snapshot: RetrievalSnapshot = {
      id: `retrieval_snapshot_${String(existing.length + 1).padStart(3, "0")}`,
      caseId: input.caseId,
      query: input.query,
      resultChunkIds: input.results.map((result) => result.chunkId),
      createdAt: nowIso(),
      promptIncluded: input.promptIncluded
    };

    await writeJsonFile(this.snapshotPath(input.caseId), [...existing, snapshot]);
    return snapshot;
  }

  async listSnapshots(caseId: string): Promise<RetrievalSnapshot[]> {
    try {
      return await readJsonFile<RetrievalSnapshot[]>(this.snapshotPath(caseId));
    } catch {
      return [];
    }
  }

  async buildKnowledgeContext(input: {
    caseId: string;
    query: RetrievalQuery;
    promptIncluded: boolean;
  }): Promise<KnowledgeContext | undefined> {
    const results = await this.search(input.query);
    if (results.length === 0) {
      return undefined;
    }

    const snapshot = await this.createSnapshot({
      caseId: input.caseId,
      query: input.query.query,
      results,
      promptIncluded: input.promptIncluded
    });
    const warnings = results.flatMap((result) => {
      const quality = result.citationQuality as CitationQuality | undefined;
      return quality?.warnings ?? (result.citation.stale ? [`Source "${result.citation.title}" is past its review date.`] : []);
    });

    return {
      query: input.query.query,
      results,
      snapshots: [snapshot],
      warnings
    };
  }
}
