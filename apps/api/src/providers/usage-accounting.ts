import type { ProviderCall, ProviderCallStatus, ProviderUsageSummary, UsageRecord } from "../schemas/providers.schema";
import { createId } from "../utils/ids";

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export class UsageAccountingService {
  private readonly records: UsageRecord[] = [];

  record(call: ProviderCall): UsageRecord {
    const usageRecord: UsageRecord = {
      id: createId("usage"),
      caseId: call.caseId,
      provider: call.provider,
      model: call.model,
      promptVersion: call.promptVersion,
      taskType: call.taskType,
      status: call.status,
      totalTokens: call.tokens.totalTokens,
      latencyMs: call.latencyMs,
      createdAt: call.completedAt
    };
    this.records.push(usageRecord);
    return usageRecord;
  }

  list(): UsageRecord[] {
    return [...this.records];
  }

  summarize(): ProviderUsageSummary[] {
    const grouped = new Map<string, UsageRecord[]>();
    for (const record of this.records) {
      const key = `${record.provider}:${record.model}`;
      grouped.set(key, [...(grouped.get(key) ?? []), record]);
    }

    return [...grouped.values()].map((records) => {
      const [first] = records;
      const totalLatency = records.reduce((sum, record) => sum + record.latencyMs, 0);
      return {
        provider: first.provider,
        model: first.model,
        calls: records.length,
        failures: records.filter((record) => record.status === "failed").length,
        blocked: records.filter((record) => record.status === "blocked").length,
        totalTokens: records.reduce((sum, record) => sum + record.totalTokens, 0),
        averageLatencyMs: records.length === 0 ? 0 : Math.round(totalLatency / records.length)
      };
    });
  }
}

export function buildProviderCall(input: {
  caseId: string;
  provider: string;
  model: string;
  promptVersion: string;
  taskType: string;
  status: ProviderCallStatus;
  systemPrompt: string;
  userPrompt: string;
  outputText: string;
  startedAt: string;
  completedAt: string;
  errorSummary?: string;
}): ProviderCall {
  const promptTokens = estimateTokens(`${input.systemPrompt}\n${input.userPrompt}`);
  const completionTokens = estimateTokens(input.outputText);
  const latencyMs = Math.max(0, Date.parse(input.completedAt) - Date.parse(input.startedAt));
  return {
    id: createId("provider_call"),
    caseId: input.caseId,
    provider: input.provider,
    model: input.model,
    promptVersion: input.promptVersion,
    taskType: input.taskType,
    status: input.status,
    latencyMs,
    tokens: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens
    },
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    errorSummary: input.errorSummary
  };
}
