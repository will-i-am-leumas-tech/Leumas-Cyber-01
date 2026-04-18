import path from "node:path";
import type {
  AuthorizationScope,
  CreateAuthorizationScopeInput,
  CreateValidationCampaignInput,
  CreateValidationResultInput,
  TelemetryExpectation,
  ValidationCampaign,
  ValidationObjective,
  ValidationResult
} from "../schemas/validation.schema";
import type {
  AuthorizedScopeV2,
  ControlEvidenceReport,
  CreateAuthorizedScopeV2Input,
  CreateValidationCampaignV2Input,
  ReplayedTelemetryEvent,
  ValidationCampaignV2,
  ValidationTemplate
} from "../schemas/validation-v2.schema";
import {
  authorizationScopeSchema,
  telemetryExpectationSchema,
  validationCampaignSchema,
  validationObjectiveSchema,
  validationResultSchema
} from "../schemas/validation.schema";
import {
  authorizedScopeV2Schema,
  controlEvidenceReportSchema,
  replayedTelemetryEventSchema,
  validationCampaignV2Schema
} from "../schemas/validation-v2.schema";
import { ensureDir, readJsonFile, writeJsonFile } from "../utils/files";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import { buildAuthorizationScope, evaluateScopeForCampaign } from "./authorization-service";
import { buildControlEvidenceReport } from "./control-evidence-report";
import { replayBenignTelemetry } from "./detection-replay-service";
import { enforceLabMode } from "./lab-mode-enforcer";
import { buildValidationObjective, getValidationObjectiveTemplate } from "./objective-library";
import { buildAuthorizedScopeV2 } from "./scope-v2-service";
import { evaluateTargetScope } from "./target-scope-policy";
import { checkTelemetryExpectations } from "./telemetry-checker";
import { getValidationTemplate, listValidationTemplates } from "./validation-template-library";

interface ValidationState {
  authorizationScopes: AuthorizationScope[];
  validationCampaigns: ValidationCampaign[];
  validationObjectives: ValidationObjective[];
  telemetryExpectations: TelemetryExpectation[];
  validationResults: ValidationResult[];
  authorizationScopesV2: AuthorizedScopeV2[];
  validationCampaignsV2: ValidationCampaignV2[];
  replayedTelemetryEvents: ReplayedTelemetryEvent[];
  controlEvidenceReports: ControlEvidenceReport[];
}

function emptyValidationState(): ValidationState {
  return {
    authorizationScopes: [],
    validationCampaigns: [],
    validationObjectives: [],
    telemetryExpectations: [],
    validationResults: [],
    authorizationScopesV2: [],
    validationCampaignsV2: [],
    replayedTelemetryEvents: [],
    controlEvidenceReports: []
  };
}

export class ValidationService {
  constructor(private readonly dataDir: string) {}

  private statePath(): string {
    return path.join(this.dataDir, "validation", "state.json");
  }

  private async readState(): Promise<ValidationState> {
    try {
      const state = await readJsonFile<ValidationState>(this.statePath());
      return {
        authorizationScopes: state.authorizationScopes.map((scope) => authorizationScopeSchema.parse(scope)),
        validationCampaigns: state.validationCampaigns.map((campaign) => validationCampaignSchema.parse(campaign)),
        validationObjectives: state.validationObjectives.map((objective) => validationObjectiveSchema.parse(objective)),
        telemetryExpectations: state.telemetryExpectations.map((expectation) => telemetryExpectationSchema.parse(expectation)),
        validationResults: state.validationResults.map((result) => validationResultSchema.parse(result)),
        authorizationScopesV2: (state.authorizationScopesV2 ?? []).map((scope) => authorizedScopeV2Schema.parse(scope)),
        validationCampaignsV2: (state.validationCampaignsV2 ?? []).map((campaign) => validationCampaignV2Schema.parse(campaign)),
        replayedTelemetryEvents: (state.replayedTelemetryEvents ?? []).map((event) => replayedTelemetryEventSchema.parse(event)),
        controlEvidenceReports: (state.controlEvidenceReports ?? []).map((report) => controlEvidenceReportSchema.parse(report))
      };
    } catch {
      return emptyValidationState();
    }
  }

  private async writeState(state: ValidationState): Promise<void> {
    await ensureDir(path.dirname(this.statePath()));
    await writeJsonFile(this.statePath(), state);
  }

  async listScopes(): Promise<AuthorizationScope[]> {
    return (await this.readState()).authorizationScopes;
  }

  async createScope(input: CreateAuthorizationScopeInput): Promise<AuthorizationScope> {
    const state = await this.readState();
    const scope = buildAuthorizationScope(input);
    state.authorizationScopes.push(scope);
    await this.writeState(state);
    return scope;
  }

  async listScopesV2(): Promise<AuthorizedScopeV2[]> {
    return (await this.readState()).authorizationScopesV2;
  }

  async createScopeV2(input: CreateAuthorizedScopeV2Input): Promise<AuthorizedScopeV2> {
    const state = await this.readState();
    const scope = buildAuthorizedScopeV2(input);
    state.authorizationScopesV2.push(scope);
    await this.writeState(state);
    return scope;
  }

  listTemplatesV2(): ValidationTemplate[] {
    return listValidationTemplates();
  }

  async createCampaignV2(input: CreateValidationCampaignV2Input): Promise<
    | { allowed: true; campaign: ValidationCampaignV2; templates: ValidationTemplate[]; warnings: string[] }
    | { allowed: false; reason: string; warnings: string[] }
  > {
    const state = await this.readState();
    const scope = state.authorizationScopesV2.find((candidate) => candidate.id === input.scopeId);
    const targetDecision = evaluateTargetScope({ scope, target: input.target });
    if (!targetDecision.allowed) {
      return {
        allowed: false,
        reason: targetDecision.reason ?? "target_scope_denied",
        warnings: targetDecision.warnings
      };
    }

    const templates = input.templateIds.map((templateId) => getValidationTemplate(templateId));
    const missingTemplateId = input.templateIds.find((templateId, index) => !templates[index]);
    if (missingTemplateId) {
      return {
        allowed: false,
        reason: "validation_template_not_found",
        warnings: [`Unknown validation template ${missingTemplateId}.`]
      };
    }

    if (!input.templateIds.every((templateId) => scope!.approvedTemplateIds.includes(templateId))) {
      return {
        allowed: false,
        reason: "template_not_approved_for_scope",
        warnings: ["One or more requested templates were not approved in the scope."]
      };
    }

    const labDecision = enforceLabMode(scope!, templates as ValidationTemplate[]);
    if (!labDecision.allowed) {
      return {
        allowed: false,
        reason: labDecision.reason ?? "lab_mode_denied",
        warnings: labDecision.warnings
      };
    }

    const timestamp = nowIso();
    const campaign = validationCampaignV2Schema.parse({
      id: createId("validation_campaign_v2"),
      scopeId: input.scopeId,
      templateIds: input.templateIds,
      actor: input.actor,
      target: input.target,
      status: "planned",
      evidenceIds: [],
      safetyDecisions: ["authorized_scope_valid", "target_allowlisted", "lab_mode_enforced"],
      createdAt: timestamp,
      updatedAt: timestamp
    });

    state.validationCampaignsV2.push(campaign);
    await this.writeState(state);

    return {
      allowed: true,
      campaign,
      templates: templates as ValidationTemplate[],
      warnings: [...targetDecision.warnings, ...labDecision.warnings]
    };
  }

  async getCampaignV2(campaignId: string): Promise<
    | {
        campaign: ValidationCampaignV2;
        scope?: AuthorizedScopeV2;
        templates: ValidationTemplate[];
        replayedTelemetry: ReplayedTelemetryEvent[];
        reports: ControlEvidenceReport[];
      }
    | undefined
  > {
    const state = await this.readState();
    const campaign = state.validationCampaignsV2.find((candidate) => candidate.id === campaignId);
    if (!campaign) {
      return undefined;
    }

    return {
      campaign,
      scope: state.authorizationScopesV2.find((scope) => scope.id === campaign.scopeId),
      templates: campaign.templateIds.map((templateId) => getValidationTemplate(templateId)).filter((template): template is ValidationTemplate => Boolean(template)),
      replayedTelemetry: state.replayedTelemetryEvents.filter((event) => event.campaignId === campaignId),
      reports: state.controlEvidenceReports.filter((report) => report.campaignId === campaignId)
    };
  }

  async replayCampaignV2(campaignId: string): Promise<
    | {
        campaign: ValidationCampaignV2;
        replayedTelemetry: ReplayedTelemetryEvent[];
      }
    | undefined
  > {
    const state = await this.readState();
    const campaignIndex = state.validationCampaignsV2.findIndex((campaign) => campaign.id === campaignId);
    if (campaignIndex === -1) {
      return undefined;
    }

    const campaign = state.validationCampaignsV2[campaignIndex];
    const templates = campaign.templateIds
      .map((templateId) => getValidationTemplate(templateId))
      .filter((template): template is ValidationTemplate => Boolean(template));
    const replayedTelemetry = replayBenignTelemetry({ campaign, templates });
    const updatedCampaign = {
      ...campaign,
      status: "replayed" as const,
      evidenceIds: [...new Set([...campaign.evidenceIds, ...replayedTelemetry.map((event) => event.evidenceId)])],
      updatedAt: nowIso()
    };

    state.validationCampaignsV2[campaignIndex] = updatedCampaign;
    state.replayedTelemetryEvents.push(...replayedTelemetry);
    await this.writeState(state);

    return {
      campaign: updatedCampaign,
      replayedTelemetry
    };
  }

  async buildEvidenceReportV2(campaignId: string): Promise<{ report: ControlEvidenceReport; campaign: ValidationCampaignV2 } | undefined> {
    const state = await this.readState();
    const campaignIndex = state.validationCampaignsV2.findIndex((campaign) => campaign.id === campaignId);
    if (campaignIndex === -1) {
      return undefined;
    }

    const campaign = state.validationCampaignsV2[campaignIndex];
    const templates = campaign.templateIds
      .map((templateId) => getValidationTemplate(templateId))
      .filter((template): template is ValidationTemplate => Boolean(template));
    const replayedTelemetry = state.replayedTelemetryEvents.filter((event) => event.campaignId === campaignId);
    const report = buildControlEvidenceReport({ campaign, templates, replayedTelemetry });
    const updatedCampaign = {
      ...campaign,
      status: "reported" as const,
      updatedAt: nowIso()
    };

    state.validationCampaignsV2[campaignIndex] = updatedCampaign;
    state.controlEvidenceReports.push(report);
    await this.writeState(state);

    return {
      report,
      campaign: updatedCampaign
    };
  }

  async createCampaign(input: CreateValidationCampaignInput): Promise<
    | { allowed: true; campaign: ValidationCampaign; objectives: ValidationObjective[]; expectations: TelemetryExpectation[] }
    | { allowed: false; reason: string; warnings: string[] }
  > {
    const state = await this.readState();
    const scope = state.authorizationScopes.find((candidate) => candidate.id === input.scopeId);
    const scopePolicy = evaluateScopeForCampaign(scope);
    if (!scopePolicy.allowed) {
      return {
        allowed: false,
        reason: scopePolicy.reason ?? "authorization_scope_invalid",
        warnings: scopePolicy.warnings
      };
    }

    const templates = input.objectiveTemplateIds.map((templateId) => getValidationObjectiveTemplate(templateId));
    const missingTemplateId = input.objectiveTemplateIds.find((templateId, index) => !templates[index]);
    if (missingTemplateId) {
      return {
        allowed: false,
        reason: "validation_objective_template_not_found",
        warnings: [`Unknown validation objective template ${missingTemplateId}.`]
      };
    }

    const now = nowIso();
    const campaign: ValidationCampaign = {
      id: createId("validation_campaign"),
      scopeId: input.scopeId,
      objective: input.objective,
      controlsUnderTest: input.controlsUnderTest,
      status: "planned",
      owner: input.owner,
      safetyWarnings: scopePolicy.warnings,
      createdAt: now,
      updatedAt: now
    };
    const objectives = templates.map((template) => buildValidationObjective(campaign.id, template!));
    const expectations = objectives.flatMap((objective) => objective.expectedTelemetry);

    state.validationCampaigns.push(campaign);
    state.validationObjectives.push(...objectives);
    state.telemetryExpectations.push(...expectations);
    await this.writeState(state);

    return {
      allowed: true,
      campaign,
      objectives,
      expectations
    };
  }

  async getCampaign(campaignId: string): Promise<
    | {
        campaign: ValidationCampaign;
        scope?: AuthorizationScope;
        objectives: ValidationObjective[];
        expectations: TelemetryExpectation[];
        results: ValidationResult[];
      }
    | undefined
  > {
    const state = await this.readState();
    const campaign = state.validationCampaigns.find((candidate) => candidate.id === campaignId);
    if (!campaign) {
      return undefined;
    }

    return {
      campaign,
      scope: state.authorizationScopes.find((scope) => scope.id === campaign.scopeId),
      objectives: state.validationObjectives.filter((objective) => objective.campaignId === campaignId),
      expectations: state.telemetryExpectations.filter((expectation) => expectation.campaignId === campaignId),
      results: state.validationResults.filter((result) => result.campaignId === campaignId)
    };
  }

  async recordResult(campaignId: string, input: CreateValidationResultInput): Promise<{ result: ValidationResult } | undefined> {
    const state = await this.readState();
    const campaignIndex = state.validationCampaigns.findIndex((campaign) => campaign.id === campaignId);
    if (campaignIndex === -1) {
      return undefined;
    }

    const expectations = state.telemetryExpectations.filter((expectation) => expectation.campaignId === campaignId);
    const check = checkTelemetryExpectations(expectations, input.observedTelemetry);
    const result: ValidationResult = {
      id: createId("validation_result"),
      campaignId,
      observedTelemetry: input.observedTelemetry,
      gaps: check.gaps,
      remediationTasks: check.remediationTasks,
      evidenceRefs: input.evidenceRefs,
      status: check.status,
      createdAt: nowIso()
    };

    state.validationResults.push(result);
    state.validationCampaigns[campaignIndex] = {
      ...state.validationCampaigns[campaignIndex],
      status: check.status === "passed" ? "completed" : "in_progress",
      updatedAt: nowIso()
    };
    await this.writeState(state);

    return {
      result
    };
  }
}
