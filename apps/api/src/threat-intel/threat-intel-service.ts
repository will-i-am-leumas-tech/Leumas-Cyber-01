import path from "node:path";
import type { Indicator } from "../schemas/result.schema";
import type { DetectionIntent } from "../schemas/detections.schema";
import type {
  CreateInternalSightingInput,
  IndicatorEnrichment,
  IndicatorLifecycle,
  InternalSighting,
  PatchIndicatorLifecycleInput,
  ThreatContextSummary,
  ThreatIntelSource
} from "../schemas/threat-intel.schema";
import {
  indicatorEnrichmentSchema,
  indicatorLifecycleSchema,
  internalSightingSchema,
  threatContextSummarySchema,
  threatIntelSourceSchema
} from "../schemas/threat-intel.schema";
import type {
  CreateIntelSourceInput,
  ImportIntelFeedInput,
  IntelDetectionInput,
  IntelGraph,
  IntelRelationship,
  IntelSource,
  InternalPrevalenceRecord,
  RetroHuntRequest,
  RetroHuntRequestInput,
  StixObjectRecord
} from "../schemas/threat-intel-v2.schema";
import {
  intelRelationshipSchema,
  intelSourceSchema,
  internalPrevalenceRecordSchema,
  retroHuntRequestSchema,
  stixObjectRecordSchema
} from "../schemas/threat-intel-v2.schema";
import { ensureDir, readJsonFile, writeJsonFile } from "../utils/files";
import { nowIso } from "../utils/time";
import { buildEnrichments, indicatorIdFor } from "./enrichment-registry";
import { buildIndicatorLifecycle } from "./lifecycle-service";
import { loadLocalReputation } from "./local-reputation.adapter";
import { buildInternalSighting, updateInternalPrevalence } from "./sighting-service";
import { buildIntelSource, defaultIntelSources, legacySourceFromIntelSource } from "./intel-source-registry";
import { parseStixBundle } from "./stix-parser";
import { importMispEvent } from "./misp-connector";
import { buildRelationshipGraph } from "./relationship-graph-service";
import { buildRetroHuntRequest } from "./retro-hunt-builder";
import { buildIntelDetection } from "./intel-to-detection-service";

interface ThreatIntelState {
  threatIntelSources: ThreatIntelSource[];
  indicatorEnrichments: IndicatorEnrichment[];
  internalSightings: InternalSighting[];
  indicatorLifecycle: IndicatorLifecycle[];
  threatContextSummaries: ThreatContextSummary[];
  intelSources: IntelSource[];
  stixObjects: StixObjectRecord[];
  intelRelationships: IntelRelationship[];
  internalPrevalenceRecords: InternalPrevalenceRecord[];
  retroHunts: RetroHuntRequest[];
  intelDetectionIntents: DetectionIntent[];
}

function emptyState(): ThreatIntelState {
  return {
    threatIntelSources: [],
    indicatorEnrichments: [],
    internalSightings: [],
    indicatorLifecycle: [],
    threatContextSummaries: [],
    intelSources: [],
    stixObjects: [],
    intelRelationships: [],
    internalPrevalenceRecords: [],
    retroHunts: [],
    intelDetectionIntents: []
  };
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function sourceForImport(state: ThreatIntelState, sourceId: string): IntelSource {
  return state.intelSources.find((source) => source.id === sourceId) ?? defaultIntelSources().find((source) => source.id === sourceId) ?? {
    id: sourceId,
    name: sourceId,
    type: "manual",
    trustScore: 0.65,
    owner: "intel",
    updateCadence: "manual",
    retentionDays: 90,
    enabled: true,
    createdAt: nowIso()
  };
}

function indicatorReputationFromStix(objects: StixObjectRecord[]) {
  return objects
    .filter((object) => object.type === "indicator" && object.indicatorType && object.indicatorValue)
    .map((object) => ({
      type: object.indicatorType ?? "unknown",
      value: object.indicatorValue ?? "",
      sourceId: object.sourceId,
      verdict: object.decayedConfidence >= 0.7 ? ("malicious" as const) : ("suspicious" as const),
      confidence: object.decayedConfidence,
      tags: ["stix", ...object.labels],
      firstSeen: object.firstSeen,
      lastSeen: object.lastSeen
    }));
}

export class ThreatIntelService {
  constructor(private readonly dataDir: string) {}

  private statePath(): string {
    return path.join(this.dataDir, "threat-intel", "state.json");
  }

  private async readState(): Promise<ThreatIntelState> {
    try {
      const state = await readJsonFile<ThreatIntelState>(this.statePath());
      return {
        threatIntelSources: (state.threatIntelSources ?? []).map((source) => threatIntelSourceSchema.parse(source)),
        indicatorEnrichments: (state.indicatorEnrichments ?? []).map((enrichment) => indicatorEnrichmentSchema.parse(enrichment)),
        internalSightings: (state.internalSightings ?? []).map((sighting) => internalSightingSchema.parse(sighting)),
        indicatorLifecycle: (state.indicatorLifecycle ?? []).map((lifecycle) => indicatorLifecycleSchema.parse(lifecycle)),
        threatContextSummaries: (state.threatContextSummaries ?? []).map((summary) => threatContextSummarySchema.parse(summary)),
        intelSources: (state.intelSources ?? []).map((source) => intelSourceSchema.parse(source)),
        stixObjects: (state.stixObjects ?? []).map((object) => stixObjectRecordSchema.parse(object)),
        intelRelationships: (state.intelRelationships ?? []).map((relationship) => intelRelationshipSchema.parse(relationship)),
        internalPrevalenceRecords: (state.internalPrevalenceRecords ?? []).map((record) =>
          internalPrevalenceRecordSchema.parse(record)
        ),
        retroHunts: (state.retroHunts ?? []).map((retroHunt) => retroHuntRequestSchema.parse(retroHunt)),
        intelDetectionIntents: state.intelDetectionIntents ?? []
      };
    } catch {
      return emptyState();
    }
  }

  private async writeState(state: ThreatIntelState): Promise<void> {
    await ensureDir(path.dirname(this.statePath()));
    await writeJsonFile(this.statePath(), state);
  }

  async enrichIndicators(indicators: Indicator[], caseId?: string): Promise<{
    threatIntelSources: ThreatIntelSource[];
    indicatorEnrichments: IndicatorEnrichment[];
    internalSightings: InternalSighting[];
    indicatorLifecycle: IndicatorLifecycle[];
    threatContextSummaries: ThreatContextSummary[];
  }> {
    const state = await this.readState();
    const local = await loadLocalReputation();
    const legacyFeedSources = state.intelSources.map(legacySourceFromIntelSource);
    const sourcesById = new Map([...local.sources, ...legacyFeedSources, ...state.threatIntelSources].map((source) => [source.id, source]));
    const sources = [...sourcesById.values()];
    const feedReputation = indicatorReputationFromStix(state.stixObjects);
    const { enrichments, summaries } = buildEnrichments({
      caseId,
      indicators,
      sources,
      reputation: [...local.reputation, ...feedReputation],
      sightings: state.internalSightings
    });

    const nextState: ThreatIntelState = {
      threatIntelSources: sources,
      indicatorEnrichments: [...state.indicatorEnrichments, ...enrichments],
      internalSightings: state.internalSightings,
      indicatorLifecycle: state.indicatorLifecycle,
      threatContextSummaries: [...state.threatContextSummaries, ...summaries],
      intelSources: state.intelSources,
      stixObjects: state.stixObjects,
      intelRelationships: state.intelRelationships,
      internalPrevalenceRecords: state.internalPrevalenceRecords,
      retroHunts: state.retroHunts,
      intelDetectionIntents: state.intelDetectionIntents
    };
    await this.writeState(nextState);

    return {
      threatIntelSources: sources,
      indicatorEnrichments: enrichments,
      internalSightings: [],
      indicatorLifecycle: state.indicatorLifecycle,
      threatContextSummaries: summaries
    };
  }

  async getIndicator(indicatorId: string): Promise<{
    indicatorId: string;
    enrichments: IndicatorEnrichment[];
    sightings: InternalSighting[];
    lifecycle: IndicatorLifecycle[];
    summaries: ThreatContextSummary[];
    prevalence: InternalPrevalenceRecord[];
  }> {
    const state = await this.readState();
    return {
      indicatorId,
      enrichments: state.indicatorEnrichments.filter((enrichment) => enrichment.indicatorId === indicatorId),
      sightings: state.internalSightings.filter((sighting) => sighting.indicatorId === indicatorId),
      lifecycle: state.indicatorLifecycle.filter((lifecycle) => lifecycle.indicatorId === indicatorId),
      summaries: state.threatContextSummaries.filter((summary) => summary.indicatorId === indicatorId),
      prevalence: state.internalPrevalenceRecords.filter((record) => record.indicatorId === indicatorId)
    };
  }

  async addSighting(input: CreateInternalSightingInput): Promise<InternalSighting> {
    const state = await this.readState();
    const sighting = buildInternalSighting(input);
    state.internalSightings.push(sighting);
    state.internalPrevalenceRecords = updateInternalPrevalence(state.internalPrevalenceRecords, sighting);
    await this.writeState(state);
    return sighting;
  }

  async updateLifecycle(indicatorId: string, input: PatchIndicatorLifecycleInput): Promise<IndicatorLifecycle> {
    const state = await this.readState();
    const lifecycle = buildIndicatorLifecycle(indicatorId, input);
    state.indicatorLifecycle = [...state.indicatorLifecycle.filter((item) => item.indicatorId !== indicatorId), lifecycle];
    await this.writeState(state);
    return lifecycle;
  }

  async createSource(input: CreateIntelSourceInput): Promise<IntelSource> {
    const state = await this.readState();
    const source = buildIntelSource(input);
    state.intelSources = uniqueById([...state.intelSources, source]);
    await this.writeState(state);
    return source;
  }

  async importFeed(input: ImportIntelFeedInput): Promise<{
    intelSource: IntelSource;
    stixObjects: StixObjectRecord[];
    intelRelationships: IntelRelationship[];
  }> {
    const state = await this.readState();
    const source = {
      ...sourceForImport(state, input.sourceId),
      lastImportedAt: nowIso()
    };
    const imported =
      input.format === "misp"
        ? importMispEvent(input.event ?? {}, source)
        : parseStixBundle(input.bundle ?? {}, source);

    state.intelSources = uniqueById([...state.intelSources, source]);
    state.stixObjects = uniqueById([...state.stixObjects, ...imported.objects]);
    state.intelRelationships = uniqueById([...state.intelRelationships, ...imported.relationships]);
    await this.writeState(state);

    return {
      intelSource: source,
      stixObjects: imported.objects,
      intelRelationships: imported.relationships
    };
  }

  async getGraph(objectId: string): Promise<IntelGraph> {
    const state = await this.readState();
    return buildRelationshipGraph(objectId, state.stixObjects, state.intelRelationships);
  }

  async createRetroHunt(input: RetroHuntRequestInput): Promise<RetroHuntRequest> {
    const state = await this.readState();
    const retroHunt = buildRetroHuntRequest(input, state.stixObjects);
    state.retroHunts.push(retroHunt);
    await this.writeState(state);
    return retroHunt;
  }

  async buildDetectionFromIntel(input: IntelDetectionInput): Promise<{
    detectionIntent: DetectionIntent;
    citations: string[];
    warnings: string[];
  }> {
    const state = await this.readState();
    const result = buildIntelDetection(input, state.stixObjects);
    state.intelDetectionIntents.push(result.detectionIntent);
    await this.writeState(state);
    return result;
  }
}

export { indicatorIdFor };
