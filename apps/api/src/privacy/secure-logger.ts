import type { SensitiveFinding } from "../schemas/privacy.schema";
import { applyRedactions } from "./redaction-service";

export function sanitizeForLog(message: string, findings: SensitiveFinding[]): string {
  return applyRedactions(message, findings);
}
