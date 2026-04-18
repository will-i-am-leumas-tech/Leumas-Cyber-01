import { createHash, randomBytes } from "node:crypto";
import path from "node:path";
import {
  serviceAccountSchema,
  type CreateServiceAccountInput,
  type ServiceAccount
} from "../schemas/auth-v2.schema";
import { ensureDir, readJsonFile, writeJsonFile } from "../utils/files";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

interface ServiceAccountState {
  serviceAccounts: ServiceAccount[];
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function statusFor(account: ServiceAccount, at = nowIso()): ServiceAccount["status"] {
  if (account.status === "revoked") {
    return "revoked";
  }
  return account.expiresAt < at ? "expired" : "active";
}

export class ServiceAccountService {
  constructor(private readonly dataDir: string) {}

  private statePath(): string {
    return path.join(this.dataDir, "auth-v2", "service-accounts.json");
  }

  private async readState(): Promise<ServiceAccountState> {
    try {
      const state = await readJsonFile<ServiceAccountState>(this.statePath());
      return {
        serviceAccounts: state.serviceAccounts.map((account) =>
          serviceAccountSchema.parse({ ...account, status: statusFor(account) })
        )
      };
    } catch {
      return { serviceAccounts: [] };
    }
  }

  private async writeState(state: ServiceAccountState): Promise<void> {
    await ensureDir(path.dirname(this.statePath()));
    await writeJsonFile(this.statePath(), state);
  }

  async create(input: CreateServiceAccountInput): Promise<{ serviceAccount: ServiceAccount; issuedCredential: string }> {
    const state = await this.readState();
    const issuedCredential = `svc_${randomBytes(24).toString("hex")}`;
    const serviceAccount = serviceAccountSchema.parse({
      id: createId("service_account"),
      tenantId: input.tenantId,
      name: input.name,
      owner: input.owner,
      scopes: input.scopes,
      tokenHash: hashToken(issuedCredential),
      expiresAt: input.expiresAt,
      status: input.expiresAt < nowIso() ? "expired" : "active",
      createdAt: nowIso()
    });
    state.serviceAccounts.push(serviceAccount);
    await this.writeState(state);
    return { serviceAccount, issuedCredential };
  }

  async list(): Promise<ServiceAccount[]> {
    return (await this.readState()).serviceAccounts;
  }
}
