import type { KnowledgeSource, RetrievalQuery } from "../schemas/knowledge.schema";

export function tenantCanAccessKnowledge(source: KnowledgeSource, query: RetrievalQuery): boolean {
  const requestedTenant = query.filters?.tenantId ?? "tenant_default";
  return source.tenantId === "global" || source.tenantId === requestedTenant;
}

export function knowledgeApprovalAllowed(source: KnowledgeSource, query: RetrievalQuery): boolean {
  const allowedStates = query.filters?.approvalStates ?? ["approved"];
  return allowedStates.includes(source.approvalState);
}
