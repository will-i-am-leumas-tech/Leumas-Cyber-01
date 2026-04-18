import type { StructuredOutputValidation } from "../schemas/providers.schema";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export function validateProviderStructuredOutput(input: {
  providerCallId: string;
  schemaName: string;
  output?: Record<string, unknown>;
  requiredFields?: string[];
}): StructuredOutputValidation {
  if (!input.output) {
    return {
      id: createId("structured_validation"),
      providerCallId: input.providerCallId,
      schemaName: input.schemaName,
      status: "not_provided",
      reason: "Provider did not return a structured output object.",
      createdAt: nowIso()
    };
  }

  const requiredFields = input.requiredFields ?? ["provider", "mode"];
  const missingFields = requiredFields.filter((field) => {
    const value = input.output?.[field];
    return typeof value !== "string" || value.length === 0;
  });
  const passed = missingFields.length === 0;
  return {
    id: createId("structured_validation"),
    providerCallId: input.providerCallId,
    schemaName: input.schemaName,
    status: passed ? "passed" : "failed",
    reason: passed
      ? `Structured output included required fields: ${requiredFields.join(", ")}.`
      : `Structured output missed required field${missingFields.length === 1 ? "" : "s"}: ${missingFields.join(", ")}.`,
    createdAt: nowIso()
  };
}
