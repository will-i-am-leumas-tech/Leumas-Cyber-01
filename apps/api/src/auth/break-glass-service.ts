import path from "node:path";
import {
  breakGlassGrantSchema,
  type BreakGlassGrant,
  type CreateBreakGlassGrantInput,
  type ReviewBreakGlassGrantInput
} from "../schemas/auth-v2.schema";
import { ensureDir, readJsonFile, writeJsonFile } from "../utils/files";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

interface BreakGlassState {
  grants: BreakGlassGrant[];
}

function isActive(grant: BreakGlassGrant, at = nowIso()): boolean {
  return grant.reviewStatus === "approved" && grant.active && grant.expiresAt > at;
}

export class BreakGlassService {
  constructor(private readonly dataDir: string) {}

  private statePath(): string {
    return path.join(this.dataDir, "auth-v2", "break-glass.json");
  }

  private async readState(): Promise<BreakGlassState> {
    try {
      const state = await readJsonFile<BreakGlassState>(this.statePath());
      return {
        grants: state.grants.map((grant) => breakGlassGrantSchema.parse({ ...grant, active: isActive(grant) }))
      };
    } catch {
      return { grants: [] };
    }
  }

  private async writeState(state: BreakGlassState): Promise<void> {
    await ensureDir(path.dirname(this.statePath()));
    await writeJsonFile(this.statePath(), state);
  }

  async create(input: CreateBreakGlassGrantInput): Promise<BreakGlassGrant> {
    const state = await this.readState();
    const grant = breakGlassGrantSchema.parse({
      id: createId("break_glass"),
      userId: input.userId,
      tenantId: input.tenantId,
      reason: input.reason,
      expiresAt: input.expiresAt,
      reviewStatus: "pending",
      active: false,
      createdAt: nowIso()
    });
    state.grants.push(grant);
    await this.writeState(state);
    return grant;
  }

  async review(grantId: string, input: ReviewBreakGlassGrantInput): Promise<BreakGlassGrant | null> {
    const state = await this.readState();
    const grant = state.grants.find((candidate) => candidate.id === grantId);
    if (!grant) {
      return null;
    }
    const reviewed = breakGlassGrantSchema.parse({
      ...grant,
      approver: input.approver,
      reviewStatus: input.approved ? "approved" : "rejected",
      active: input.approved && grant.expiresAt > nowIso(),
      reviewedAt: nowIso()
    });
    state.grants = state.grants.map((candidate) => (candidate.id === grantId ? reviewed : candidate));
    await this.writeState(state);
    return reviewed;
  }

  async list(): Promise<BreakGlassGrant[]> {
    return (await this.readState()).grants;
  }

  async activeForUser(userId: string): Promise<BreakGlassGrant[]> {
    return (await this.list()).filter((grant) => grant.userId === userId && isActive(grant));
  }
}
