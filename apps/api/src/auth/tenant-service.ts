import path from "node:path";
import { tenantSchema, type Tenant } from "../schemas/auth-v2.schema";
import { ensureDir, readJsonFile, writeJsonFile } from "../utils/files";
import { nowIso } from "../utils/time";

interface TenantState {
  tenants: Tenant[];
}

const defaultTenants: Tenant[] = [
  {
    id: "tenant_default",
    name: "Default Security Tenant",
    status: "active",
    dataPolicy: "local-first defensive security evidence",
    retentionPolicy: "retain case evidence according to local operator policy",
    createdAt: nowIso()
  },
  {
    id: "tenant_partner",
    name: "Partner Tenant",
    status: "active",
    dataPolicy: "partner-isolated defensive evidence",
    retentionPolicy: "retain only scoped partner evidence",
    createdAt: nowIso()
  },
  {
    id: "tenant_research",
    name: "Research Tenant",
    status: "active",
    dataPolicy: "isolated defensive validation data",
    retentionPolicy: "short-lived lab evidence",
    createdAt: nowIso()
  }
];

export class TenantService {
  constructor(private readonly dataDir: string) {}

  private statePath(): string {
    return path.join(this.dataDir, "auth-v2", "tenants.json");
  }

  private async readState(): Promise<TenantState> {
    try {
      const state = await readJsonFile<TenantState>(this.statePath());
      return {
        tenants: state.tenants.map((tenant) => tenantSchema.parse(tenant))
      };
    } catch {
      return { tenants: defaultTenants };
    }
  }

  async listTenants(): Promise<Tenant[]> {
    return (await this.readState()).tenants;
  }

  async getTenant(tenantId: string): Promise<Tenant | null> {
    return (await this.listTenants()).find((tenant) => tenant.id === tenantId) ?? null;
  }

  async ensureDefaults(): Promise<void> {
    await ensureDir(path.dirname(this.statePath()));
    await writeJsonFile(this.statePath(), { tenants: await this.listTenants() });
  }
}
