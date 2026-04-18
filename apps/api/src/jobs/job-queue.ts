import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface JobRecord {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export class InMemoryJobQueue {
  private readonly jobs = new Map<string, JobRecord>();

  enqueue(input: { type: string; payload?: Record<string, unknown>; maxAttempts?: number }): JobRecord {
    const timestamp = nowIso();
    const job: JobRecord = {
      id: createId("job"),
      type: input.type,
      payload: input.payload ?? {},
      status: "queued",
      attempts: 0,
      maxAttempts: input.maxAttempts ?? 3,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.jobs.set(job.id, job);
    return job;
  }

  get(jobId: string): JobRecord | null {
    return this.jobs.get(jobId) ?? null;
  }

  list(): JobRecord[] {
    return [...this.jobs.values()];
  }

  claim(type?: string): JobRecord | null {
    const job = [...this.jobs.values()].find((candidate) => candidate.status === "queued" && (!type || candidate.type === type));
    if (!job) {
      return null;
    }
    const updated = {
      ...job,
      status: "running" as const,
      attempts: job.attempts + 1,
      updatedAt: nowIso()
    };
    this.jobs.set(updated.id, updated);
    return updated;
  }

  complete(jobId: string): JobRecord | null {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }
    const timestamp = nowIso();
    const updated = {
      ...job,
      status: "completed" as const,
      updatedAt: timestamp,
      completedAt: timestamp
    };
    this.jobs.set(jobId, updated);
    return updated;
  }

  fail(jobId: string, error: string): JobRecord | null {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }
    const updated = {
      ...job,
      status: job.attempts < job.maxAttempts ? ("queued" as const) : ("failed" as const),
      error,
      updatedAt: nowIso()
    };
    this.jobs.set(jobId, updated);
    return updated;
  }
}
