import path from "node:path";
import type { CaseMembership, RoleId, Team, User } from "../schemas/auth.schema";
import { caseMembershipSchema, teamSchema, userSchema } from "../schemas/auth.schema";
import { ensureDir, readJsonFile, writeJsonFile } from "../utils/files";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

interface AuthState {
  users: User[];
  teams: Team[];
  caseMemberships: CaseMembership[];
}

const defaultUsers: User[] = [
  {
    id: "user_admin",
    email: "admin@example.test",
    displayName: "Admin User",
    status: "active",
    tenantIds: ["tenant_default", "tenant_research"],
    attributes: { department: "security" },
    groups: ["secops-admins"],
    teamIds: ["team_secops"],
    roles: ["admin"]
  },
  {
    id: "user_analyst",
    email: "analyst@example.test",
    displayName: "Analyst User",
    status: "active",
    tenantIds: ["tenant_default"],
    attributes: { department: "security" },
    groups: ["secops-analysts"],
    teamIds: ["team_secops"],
    roles: ["analyst"]
  },
  {
    id: "user_auditor",
    email: "auditor@example.test",
    displayName: "Auditor User",
    status: "active",
    tenantIds: ["tenant_default"],
    attributes: { department: "audit" },
    groups: ["audit-readers"],
    teamIds: ["team_audit"],
    roles: ["auditor"]
  },
  {
    id: "user_partner",
    email: "partner@example.test",
    displayName: "Partner Analyst",
    status: "active",
    tenantIds: ["tenant_partner"],
    attributes: { department: "partner-security" },
    groups: ["partner-analysts"],
    teamIds: ["team_partner"],
    roles: ["analyst"]
  }
];

const defaultTeams: Team[] = [
  {
    id: "team_secops",
    name: "Security Operations"
  },
  {
    id: "team_audit",
    name: "Audit"
  },
  {
    id: "team_partner",
    name: "Partner Security"
  }
];

function emptyState(): AuthState {
  return {
    users: defaultUsers,
    teams: defaultTeams,
    caseMemberships: []
  };
}

export class AuthService {
  constructor(private readonly dataDir: string) {}

  private statePath(): string {
    return path.join(this.dataDir, "auth", "state.json");
  }

  private async readState(): Promise<AuthState> {
    try {
      const state = await readJsonFile<AuthState>(this.statePath());
      return {
        users: state.users.map((user) => userSchema.parse(user)),
        teams: state.teams.map((team) => teamSchema.parse(team)),
        caseMemberships: state.caseMemberships.map((membership) => caseMembershipSchema.parse(membership))
      };
    } catch {
      return emptyState();
    }
  }

  private async writeState(state: AuthState): Promise<void> {
    await ensureDir(path.dirname(this.statePath()));
    await writeJsonFile(this.statePath(), state);
  }

  async listUsers(): Promise<User[]> {
    return (await this.readState()).users;
  }

  async listMemberships(caseId?: string): Promise<CaseMembership[]> {
    const memberships = (await this.readState()).caseMemberships;
    return caseId ? memberships.filter((membership) => membership.caseId === caseId) : memberships;
  }

  async getUser(userRef: string): Promise<User | null> {
    const users = await this.listUsers();
    return users.find((user) => user.id === userRef || user.email === userRef) ?? null;
  }

  async upsertMembership(input: {
    caseId: string;
    userId: string;
    role: RoleId;
    teamId?: string;
  }): Promise<CaseMembership> {
    const state = await this.readState();
    const existing = state.caseMemberships.find(
      (membership) => membership.caseId === input.caseId && membership.userId === input.userId
    );
    const membership: CaseMembership = {
      id: existing?.id ?? createId("case_member"),
      caseId: input.caseId,
      userId: input.userId,
      role: input.role,
      teamId: input.teamId,
      createdAt: existing?.createdAt ?? nowIso()
    };
    state.caseMemberships = [
      ...state.caseMemberships.filter((item) => !(item.caseId === input.caseId && item.userId === input.userId)),
      membership
    ];
    await this.writeState(state);
    return membership;
  }
}
