import type { TelemetryExpectation, ValidationResultStatus } from "../schemas/validation.schema";

export interface TelemetryCheckResult {
  status: ValidationResultStatus;
  gaps: string[];
  remediationTasks: string[];
}

export function checkTelemetryExpectations(
  expectations: TelemetryExpectation[],
  observedTelemetry: string[]
): TelemetryCheckResult {
  const observedText = observedTelemetry.join("\n").toLowerCase();
  const requiredExpectations = expectations.filter((expectation) => expectation.required);
  const gaps = requiredExpectations
    .filter((expectation) => !observedText.includes(expectation.expectedEventType.toLowerCase()))
    .map((expectation) => `Missing expected telemetry ${expectation.expectedEventType} from ${expectation.dataSource}.`);
  const remediationTasks = gaps.map((gap) => `Review logging, detection routing, or control configuration: ${gap}`);

  return {
    status: gaps.length === 0 ? "passed" : gaps.length < requiredExpectations.length ? "partial" : "failed",
    gaps,
    remediationTasks
  };
}
