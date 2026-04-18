import path from "node:path";
import type {
  CloudAccount,
  CloudEvent,
  CloudEventImportInput,
  IdentityEventImportInput,
  IdentityPrincipal,
  PermissionRisk,
  PostureFinding
} from "../schemas/cloud-security.schema";
import {
  cloudAccountSchema,
  cloudEventSchema,
  identityPrincipalSchema,
  permissionRiskSchema,
  postureFindingSchema
} from "../schemas/cloud-security.schema";
import { ensureDir, readJsonFile, writeJsonFile } from "../utils/files";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import { buildPermissionRisks, mergeIdentityPrincipals } from "../identity/identity-risk-service";
import { buildPostureFindings } from "./posture-check-service";
import { normalizeCloudEvent, normalizeIdentityEvent } from "./cloud-event-normalizer";

interface CloudSecurityState {
  cloudAccounts: CloudAccount[];
  identityPrincipals: IdentityPrincipal[];
  cloudEvents: CloudEvent[];
  postureFindings: PostureFinding[];
  permissionRisks: PermissionRisk[];
}

function emptyState(): CloudSecurityState {
  return {
    cloudAccounts: [],
    identityPrincipals: [],
    cloudEvents: [],
    postureFindings: [],
    permissionRisks: []
  };
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of [...current, ...incoming]) {
    byId.set(item.id, item);
  }
  return [...byId.values()];
}

export class CloudSecurityService {
  constructor(private readonly dataDir: string) {}

  private statePath(): string {
    return path.join(this.dataDir, "cloud-security", "state.json");
  }

  private async readState(): Promise<CloudSecurityState> {
    try {
      const state = await readJsonFile<CloudSecurityState>(this.statePath());
      return {
        cloudAccounts: state.cloudAccounts.map((account) => cloudAccountSchema.parse(account)),
        identityPrincipals: state.identityPrincipals.map((principal) => identityPrincipalSchema.parse(principal)),
        cloudEvents: state.cloudEvents.map((event) => cloudEventSchema.parse(event)),
        postureFindings: state.postureFindings.map((finding) => postureFindingSchema.parse(finding)),
        permissionRisks: state.permissionRisks.map((risk) => permissionRiskSchema.parse(risk))
      };
    } catch {
      return emptyState();
    }
  }

  private async writeState(state: CloudSecurityState): Promise<void> {
    await ensureDir(path.dirname(this.statePath()));
    await writeJsonFile(this.statePath(), state);
  }

  async importCloudEvents(input: CloudEventImportInput): Promise<CloudSecurityState> {
    const state = await this.readState();
    const cloudAccounts = input.account
      ? [
          {
            id: createId("cloud_account"),
            ...input.account,
            createdAt: nowIso()
          }
        ]
      : [];
    const cloudEvents = input.events.map((event, index) =>
      normalizeCloudEvent(event, index, {
        provider: input.provider,
        caseId: input.caseId
      })
    );
    const postureFindings = buildPostureFindings(cloudEvents);
    const permissionRisks = buildPermissionRisks(cloudEvents, state.identityPrincipals);

    const nextState: CloudSecurityState = {
      cloudAccounts: mergeById(state.cloudAccounts, cloudAccounts),
      identityPrincipals: state.identityPrincipals,
      cloudEvents: [...state.cloudEvents, ...cloudEvents],
      postureFindings: [...state.postureFindings, ...postureFindings],
      permissionRisks: [...state.permissionRisks, ...permissionRisks]
    };
    await this.writeState(nextState);

    return {
      cloudAccounts,
      identityPrincipals: [],
      cloudEvents,
      postureFindings,
      permissionRisks
    };
  }

  async importIdentityEvents(input: IdentityEventImportInput): Promise<CloudSecurityState> {
    const state = await this.readState();
    const normalized = input.events.map((event, index) =>
      normalizeIdentityEvent(event, index, {
        provider: input.provider,
        caseId: input.caseId
      })
    );
    const cloudEvents = normalized.map((item) => item.event);
    const identityPrincipals = mergeIdentityPrincipals([...state.identityPrincipals, ...normalized.map((item) => item.principal)]);
    const importedPrincipals = mergeIdentityPrincipals(normalized.map((item) => item.principal));
    const postureFindings = buildPostureFindings(cloudEvents);
    const permissionRisks = buildPermissionRisks(cloudEvents, identityPrincipals);

    const nextState: CloudSecurityState = {
      cloudAccounts: state.cloudAccounts,
      identityPrincipals,
      cloudEvents: [...state.cloudEvents, ...cloudEvents],
      postureFindings: [...state.postureFindings, ...postureFindings],
      permissionRisks: [...state.permissionRisks, ...permissionRisks]
    };
    await this.writeState(nextState);

    return {
      cloudAccounts: [],
      identityPrincipals: importedPrincipals,
      cloudEvents,
      postureFindings,
      permissionRisks
    };
  }

  async posture(): Promise<{ cloudAccounts: CloudAccount[]; postureFindings: PostureFinding[]; cloudEvents: CloudEvent[] }> {
    const state = await this.readState();
    return {
      cloudAccounts: state.cloudAccounts,
      postureFindings: state.postureFindings,
      cloudEvents: state.cloudEvents
    };
  }

  async identityRisks(): Promise<{
    identityPrincipals: IdentityPrincipal[];
    permissionRisks: PermissionRisk[];
    cloudEvents: CloudEvent[];
  }> {
    const state = await this.readState();
    return {
      identityPrincipals: state.identityPrincipals,
      permissionRisks: state.permissionRisks,
      cloudEvents: state.cloudEvents.filter((event) => event.provider === "entra" || event.provider === "okta")
    };
  }
}
