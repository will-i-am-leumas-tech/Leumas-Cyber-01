import type { CyberCase } from "../../schemas/case.schema";

export function runRetrieverAgent(cyberCase: CyberCase): Record<string, unknown> {
  const knowledge = cyberCase.result?.knowledge;
  return {
    sourceCount: knowledge?.results.length ?? 0,
    chunkIds: knowledge?.results.map((result) => result.chunkId) ?? [],
    warnings: knowledge?.warnings ?? []
  };
}
