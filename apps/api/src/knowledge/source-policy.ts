import type { KnowledgeSource, RetrievalQuery } from "../schemas/knowledge.schema";

export function isKnowledgeSourceStale(source: KnowledgeSource, now = new Date()): boolean {
  if (!source.reviewAt) {
    return false;
  }

  const reviewDate = new Date(source.reviewAt);
  if (Number.isNaN(reviewDate.getTime())) {
    return true;
  }

  return reviewDate.getTime() < now.getTime();
}

export function trustTierWeight(source: KnowledgeSource): number {
  switch (source.trustTier) {
    case "internal":
      return 1.2;
    case "standard":
      return 1.1;
    case "vendor":
      return 1;
    case "community":
      return 0.85;
    default:
      return 1;
  }
}

export function isKnowledgeSourceApprovedForRetrieval(source: KnowledgeSource, query: RetrievalQuery): boolean {
  const requestedTenant = query.filters?.tenantId ?? "tenant_default";
  const allowedApprovalStates = query.filters?.approvalStates ?? ["approved"];
  const trustFilter = query.filters?.trustTiers ?? [];

  if (source.tenantId !== "global" && source.tenantId !== requestedTenant) {
    return false;
  }

  if (!allowedApprovalStates.includes(source.approvalState)) {
    return false;
  }

  return trustFilter.length === 0 || trustFilter.includes(source.trustTier);
}
