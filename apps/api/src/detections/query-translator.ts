import type { SigmaLikeRule } from "../schemas/detections.schema";

export function translateSigmaLikeToPseudoQuery(rule: SigmaLikeRule): string {
  const clauses = Object.entries(rule.detection.selection).map(([field, values]) => {
    const joined = values.map((value) => `"${value}"`).join(", ");
    return `${field} IN (${joined})`;
  });

  return clauses.length > 0 ? clauses.join(" AND ") : "NO_DETECTION_CONDITIONS";
}
