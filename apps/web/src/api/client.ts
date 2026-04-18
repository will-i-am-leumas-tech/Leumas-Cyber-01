import type {
  AnalysisMode,
  AnalyzeResponse,
  AnalystNote,
  ApprovalQueueItem,
  CaseListItem,
  CaseQueueItem,
  CaseState,
  CyberCase,
  DashboardMetric,
  ProviderConfig,
  ProviderHealth,
  ProviderUsageSummary,
  ReportAudience,
  ReportDraft,
  ReportStatus,
  TaskStatus,
  UsageRecord,
  WorkflowPriority
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3001";

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message ?? payload.error ?? "Request failed");
  }
  return payload as T;
}

export async function listCases(): Promise<CaseListItem[]> {
  const response = await fetch(`${API_BASE_URL}/cases`);
  const payload = await parseResponse<{ cases: CaseListItem[] }>(response);
  return payload.cases;
}

export async function listCaseQueue(filters: {
  state?: CaseState;
  severity?: CyberCase["severity"];
  assignedTo?: string;
  search?: string;
} = {}): Promise<CaseQueueItem[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${API_BASE_URL}/cases/queue${suffix}`);
  const payload = await parseResponse<{ cases: CaseQueueItem[] }>(response);
  return payload.cases;
}

export async function getCase(caseId: string): Promise<CyberCase> {
  const response = await fetch(`${API_BASE_URL}/cases/${caseId}`);
  return parseResponse<CyberCase>(response);
}

export async function analyzeText(input: {
  mode: AnalysisMode;
  title?: string;
  text: string;
}): Promise<AnalyzeResponse> {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(input)
  });

  return parseResponse<AnalyzeResponse>(response);
}

export async function analyzeFile(input: {
  mode: AnalysisMode;
  title?: string;
  file: File;
}): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.set("mode", input.mode);
  if (input.title) {
    form.set("title", input.title);
  }
  form.set("file", input.file);

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    body: form
  });

  return parseResponse<AnalyzeResponse>(response);
}

export async function createTask(
  caseId: string,
  input: {
    title: string;
    description?: string;
    owner?: string;
    priority?: WorkflowPriority;
    dueAt?: string;
    linkedFindingIds?: string[];
    required?: boolean;
  }
): Promise<CyberCase> {
  const response = await fetch(`${API_BASE_URL}/cases/${caseId}/tasks`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const payload = await parseResponse<{ case: CyberCase }>(response);
  return payload.case;
}

export async function updateTaskStatus(caseId: string, taskId: string, status: TaskStatus): Promise<CyberCase> {
  const response = await fetch(`${API_BASE_URL}/cases/${caseId}/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ status })
  });
  const payload = await parseResponse<{ case: CyberCase }>(response);
  return payload.case;
}

export async function updateCaseState(caseId: string, state: CaseState, reason: string): Promise<CyberCase> {
  const response = await fetch(`${API_BASE_URL}/cases/${caseId}/state`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ state, reason })
  });
  const payload = await parseResponse<{ case: CyberCase }>(response);
  return payload.case;
}

export async function createReportDraft(caseId: string, templateId?: string): Promise<CyberCase> {
  const response = await fetch(`${API_BASE_URL}/cases/${caseId}/reports`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ templateId })
  });
  const payload = await parseResponse<{ case: CyberCase }>(response);
  return payload.case;
}

export async function updateReportDraft(
  caseId: string,
  reportId: string,
  input: {
    contentMarkdown?: string;
    status?: ReportStatus;
    diffSummary?: string;
  }
): Promise<CyberCase> {
  const response = await fetch(`${API_BASE_URL}/cases/${caseId}/reports/${reportId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const payload = await parseResponse<{ case: CyberCase; reportDraft: ReportDraft }>(response);
  return payload.case;
}

export async function createReportRedaction(caseId: string, reportId: string, audience: ReportAudience): Promise<CyberCase> {
  const response = await fetch(`${API_BASE_URL}/cases/${caseId}/reports/${reportId}/redact`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ audience })
  });
  const payload = await parseResponse<{ case: CyberCase }>(response);
  return payload.case;
}

export async function listCaseNotes(caseId: string): Promise<AnalystNote[]> {
  const response = await fetch(`${API_BASE_URL}/cases/${caseId}/notes`);
  const payload = await parseResponse<{ notes: AnalystNote[] }>(response);
  return payload.notes;
}

export async function createCaseNote(
  caseId: string,
  input: {
    author: string;
    text: string;
    mentions?: string[];
    visibility?: AnalystNote["visibility"];
  }
): Promise<{ note: AnalystNote; case: CyberCase }> {
  const response = await fetch(`${API_BASE_URL}/cases/${caseId}/notes`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(input)
  });
  return parseResponse<{ note: AnalystNote; case: CyberCase }>(response);
}

export async function listProviders(): Promise<{ activeProvider: string; selectedForAlert: ProviderConfig; providers: ProviderConfig[] }> {
  const response = await fetch(`${API_BASE_URL}/providers`);
  return parseResponse<{ activeProvider: string; selectedForAlert: ProviderConfig; providers: ProviderConfig[] }>(response);
}

export async function getProviderHealth(): Promise<{ providers: ProviderHealth[] }> {
  const response = await fetch(`${API_BASE_URL}/providers/health`);
  return parseResponse<{ providers: ProviderHealth[] }>(response);
}

export async function getProviderUsage(): Promise<{ records: UsageRecord[]; summary: ProviderUsageSummary[] }> {
  const response = await fetch(`${API_BASE_URL}/providers/usage`);
  return parseResponse<{ records: UsageRecord[]; summary: ProviderUsageSummary[] }>(response);
}

export async function listApprovals(includeResolved = false): Promise<ApprovalQueueItem[]> {
  const suffix = includeResolved ? "?includeResolved=true" : "";
  const response = await fetch(`${API_BASE_URL}/approvals${suffix}`);
  const payload = await parseResponse<{ approvals: ApprovalQueueItem[] }>(response);
  return payload.approvals;
}

export async function getModelQualityDashboard(): Promise<{
  activeProvider: string;
  providers: ProviderHealth[];
  usage: ProviderUsageSummary[];
  metrics: DashboardMetric[];
  profiles: unknown[];
  promptVersions: unknown[];
}> {
  const response = await fetch(`${API_BASE_URL}/admin/dashboards/model-quality`);
  return parseResponse<{
    activeProvider: string;
    providers: ProviderHealth[];
    usage: ProviderUsageSummary[];
    metrics: DashboardMetric[];
    profiles: unknown[];
    promptVersions: unknown[];
  }>(response);
}
