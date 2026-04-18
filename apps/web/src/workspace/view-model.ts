import type {
  CyberCase,
  Finding,
  InvestigationTask,
  NormalizedEntity,
  NormalizedEvent,
  Observation,
  ReportDraft,
  Severity,
  TaskStatus,
  TimelineEvent
} from "../types";

export interface EvidenceObservationView {
  id: string;
  type: Observation["type"];
  value: string;
  confidence: number;
  sourceLabel: string;
  excerpt?: string;
  timestamp?: string;
}

export interface EvidenceFindingView {
  id: string;
  title: string;
  severity: Severity;
  confidence: number;
  category: string;
  summary: string;
  needsAnalystReview: boolean;
  observations: EvidenceObservationView[];
  recommendations: string[];
}

export interface EvidenceViewModel {
  findings: EvidenceFindingView[];
  observations: EvidenceObservationView[];
  entities: NormalizedEntity[];
  normalizedEvents: NormalizedEvent[];
  emptyReason?: string;
}

export interface EntityGraphNode {
  id: string;
  label: string;
  type: "entity" | "event" | "indicator" | "finding";
  meta: string;
  weight: number;
}

export interface EntityGraphEdge {
  id: string;
  from: string;
  to: string;
  label: string;
}

export interface EntityGraphModel {
  nodes: EntityGraphNode[];
  edges: EntityGraphEdge[];
}

export interface EntityGraphFilters {
  query: string;
  types: EntityGraphNode["type"][];
}

export interface TaskLane {
  status: TaskStatus;
  label: string;
  tasks: InvestigationTask[];
}

export interface WorkspaceStats {
  evidenceCount: number;
  findingCount: number;
  entityCount: number;
  eventCount: number;
  taskCount: number;
  openTaskCount: number;
  reportDraftCount: number;
  safetyDecisionCount: number;
  auditEntryCount: number;
}

export interface TimelineFilters {
  query: string;
}

const taskLaneOrder: Array<{ status: TaskStatus; label: string }> = [
  { status: "open", label: "Open" },
  { status: "in_progress", label: "In Progress" },
  { status: "blocked", label: "Blocked" },
  { status: "done", label: "Done" },
  { status: "cancelled", label: "Cancelled" }
];

function sourceLabel(observation: Observation): string {
  const locator = observation.sourceRef.locator || observation.sourceRef.id;
  return `${observation.sourceRef.type}:${locator}`;
}

function observationView(observation: Observation): EvidenceObservationView {
  return {
    id: observation.id,
    type: observation.type,
    value: observation.value,
    confidence: observation.confidence,
    sourceLabel: sourceLabel(observation),
    excerpt: observation.sourceRef.excerpt,
    timestamp: observation.timestamp
  };
}

function fallbackFinding(cyberCase: CyberCase): EvidenceFindingView[] {
  const result = cyberCase.result;
  if (!result) {
    return [];
  }

  return [
    {
      id: "result-summary",
      title: result.title,
      severity: result.severity,
      confidence: result.confidence,
      category: result.category,
      summary: result.summary,
      needsAnalystReview: true,
      observations: result.evidence.map((item, index) => ({
        id: `evidence-${index + 1}`,
        type: "fact",
        value: item,
        confidence: result.confidence,
        sourceLabel: cyberCase.rawInputRef
      })),
      recommendations: result.recommendedActions
    }
  ];
}

export function buildEvidenceViewModel(cyberCase?: CyberCase): EvidenceViewModel {
  if (!cyberCase) {
    return {
      findings: [],
      observations: [],
      entities: [],
      normalizedEvents: [],
      emptyReason: "No case selected."
    };
  }

  const result = cyberCase.result;
  const reasoning = result?.reasoning;
  const observations = (reasoning?.observations ?? []).map(observationView);
  const observationsById = new Map(observations.map((observation) => [observation.id, observation]));
  const findings =
    reasoning?.findings.map((finding: Finding) => ({
      id: finding.id,
      title: finding.title,
      severity: finding.severity,
      confidence: finding.confidence,
      category: finding.category,
      summary: finding.reasoningSummary,
      needsAnalystReview: finding.needsAnalystReview,
      observations: finding.evidenceObservationIds
        .map((observationId) => observationsById.get(observationId))
        .filter((observation): observation is EvidenceObservationView => Boolean(observation)),
      recommendations: finding.recommendations
    })) ?? fallbackFinding(cyberCase);

  return {
    findings,
    observations,
    entities: result?.ingestion?.entities ?? [],
    normalizedEvents: result?.ingestion?.normalizedEvents ?? [],
    emptyReason: findings.length === 0 && observations.length === 0 ? "No evidence has been normalized for this case." : undefined
  };
}

function addNode(nodes: Map<string, EntityGraphNode>, node: EntityGraphNode): void {
  const existing = nodes.get(node.id);
  if (existing) {
    existing.weight += node.weight;
    return;
  }
  nodes.set(node.id, node);
}

export function buildEntityGraph(cyberCase?: CyberCase, filters?: EntityGraphFilters): EntityGraphModel {
  const nodes = new Map<string, EntityGraphNode>();
  const edges = new Map<string, EntityGraphEdge>();
  const result = cyberCase?.result;
  const ingestion = result?.ingestion;

  for (const entity of ingestion?.entities ?? []) {
    addNode(nodes, {
      id: entity.id,
      label: entity.normalized,
      type: "entity",
      meta: entity.type,
      weight: 1
    });
  }

  for (const indicator of result?.indicators ?? []) {
    const nodeId = `indicator:${indicator.type}:${indicator.normalized}`;
    addNode(nodes, {
      id: nodeId,
      label: indicator.normalized,
      type: "indicator",
      meta: indicator.type,
      weight: 1
    });
  }

  for (const event of ingestion?.normalizedEvents ?? []) {
    const eventNodeId = `event:${event.id}`;
    addNode(nodes, {
      id: eventNodeId,
      label: event.eventType,
      type: "event",
      meta: event.timestamp ?? event.source,
      weight: 1
    });
    for (const entityId of event.entityIds) {
      if (!nodes.has(entityId)) {
        continue;
      }
      const edgeId = `${eventNodeId}->${entityId}`;
      edges.set(edgeId, {
        id: edgeId,
        from: eventNodeId,
        to: entityId,
        label: "observed"
      });
      const node = nodes.get(entityId);
      if (node) {
        node.weight += 1;
      }
    }
  }

  for (const finding of result?.reasoning?.findings ?? []) {
    const findingNodeId = `finding:${finding.id}`;
    addNode(nodes, {
      id: findingNodeId,
      label: finding.title,
      type: "finding",
      meta: `${finding.severity} severity`,
      weight: 1
    });
    for (const observationId of finding.evidenceObservationIds) {
      const observation = result?.reasoning?.observations.find((candidate) => candidate.id === observationId);
      for (const entityRef of observation?.entityRefs ?? []) {
        if (!nodes.has(entityRef)) {
          continue;
        }
        const edgeId = `${findingNodeId}->${entityRef}`;
        edges.set(edgeId, {
          id: edgeId,
          from: findingNodeId,
          to: entityRef,
          label: "supports"
        });
      }
    }
  }

  const query = filters?.query.trim().toLowerCase() ?? "";
  const allowedTypes = new Set(filters?.types ?? []);
  const filteredNodes = [...nodes.values()]
    .filter((node) => allowedTypes.size === 0 || allowedTypes.has(node.type))
    .filter((node) => {
      if (!query) {
        return true;
      }
      return [node.label, node.meta, node.type].join(" ").toLowerCase().includes(query);
    });
  const filteredNodeIds = new Set(filteredNodes.map((node) => node.id));

  return {
    nodes: filteredNodes
      .sort((a, b) => b.weight - a.weight || a.type.localeCompare(b.type) || a.label.localeCompare(b.label))
      .slice(0, 32),
    edges: [...edges.values()].filter((edge) => filteredNodeIds.has(edge.from) && filteredNodeIds.has(edge.to)).slice(0, 48)
  };
}

export function groupTasksByStatus(tasks: InvestigationTask[]): TaskLane[] {
  return taskLaneOrder.map((lane) => ({
    ...lane,
    tasks: tasks
      .filter((task) => task.status === lane.status)
      .sort((a, b) => a.priority.localeCompare(b.priority) || a.title.localeCompare(b.title))
  }));
}

export function buildWorkspaceStats(cyberCase?: CyberCase): WorkspaceStats {
  return {
    evidenceCount: cyberCase?.result?.evidence.length ?? 0,
    findingCount: cyberCase?.result?.reasoning?.findings.length ?? 0,
    entityCount: cyberCase?.result?.ingestion?.entities.length ?? 0,
    eventCount: cyberCase?.result?.ingestion?.normalizedEvents.length ?? cyberCase?.result?.timeline.length ?? 0,
    taskCount: cyberCase?.tasks.length ?? 0,
    openTaskCount: cyberCase?.tasks.filter((task) => task.status !== "done" && task.status !== "cancelled").length ?? 0,
    reportDraftCount: cyberCase?.reportDrafts.length ?? 0,
    safetyDecisionCount: cyberCase?.safetyDecisions.length ?? 0,
    auditEntryCount: cyberCase?.auditEntries.length ?? 0
  };
}

export function filterTimelineEvents(events: TimelineEvent[], filters: TimelineFilters): TimelineEvent[] {
  const query = filters.query.trim().toLowerCase();
  if (!query) {
    return events;
  }

  return events.filter((event) =>
    [event.timestamp, event.label, event.source, event.raw]
      .filter((item): item is string => Boolean(item))
      .some((item) => item.toLowerCase().includes(query))
  );
}

export function activeReportDraft(cyberCase: CyberCase): ReportDraft | undefined {
  return [...cyberCase.reportDrafts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}
