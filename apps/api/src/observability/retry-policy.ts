import type { RetryPolicy } from "../schemas/observability.schema";

export function shouldRetry(input: { attempts: number; policy: RetryPolicy }): boolean {
  return input.attempts < input.policy.maxAttempts;
}

export function nextBackoffMs(input: { attempts: number; policy: RetryPolicy }): number {
  return input.policy.backoffMs * Math.max(1, input.attempts);
}
