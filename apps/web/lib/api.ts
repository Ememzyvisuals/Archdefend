const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
  constructor(public status: number, message: string, public data?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("archdefend_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (authenticated) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let detail = "Request failed";
    try {
      const err = await res.json();
      detail = err.detail || err.message || detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  getGithubUrl: () => request<{ url: string; state: string }>("/auth/github", {}, false),

  githubCallback: (code: string, state?: string) =>
    request<{ access_token: string; refresh_token: string; user: User }>(
      `/auth/github/callback?code=${code}${state ? `&state=${state}` : ""}`,
      {},
      false
    ),

  googleLogin: (id_token: string) =>
    request<{ access_token: string; refresh_token: string; user: User }>(
      "/auth/google",
      { method: "POST", body: JSON.stringify({ id_token }) },
      false
    ),

  refresh: (refresh_token: string) =>
    request<{ access_token: string; refresh_token: string }>(
      "/auth/refresh",
      { method: "POST", body: JSON.stringify({ refresh_token }) },
      false
    ),

  me: () => request<User>("/auth/me"),
  logout: () => request("/auth/logout", { method: "POST" }),
};

// ─── Workspaces ───────────────────────────────────────────────────────────────
export const workspacesApi = {
  list: () => request<Workspace[]>("/workspaces/my"),
  get: (id: string) => request<Workspace>(`/workspaces/${id}`),
  update: (id: string, data: Partial<Workspace>) =>
    request(`/workspaces/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  members: (id: string) => request<Member[]>(`/workspaces/${id}/members`),
  removeMember: (workspaceId: string, userId: string) =>
    request(`/workspaces/${workspaceId}/members/${userId}`, { method: "DELETE" }),
};

// ─── Repositories ─────────────────────────────────────────────────────────────
export const repositoriesApi = {
  listGithub: (page = 1) => request<GithubRepo[]>(`/repositories/github/list?page=${page}`),
  listWorkspace: (workspaceId: string) =>
    request<Repository[]>(`/repositories/workspace/${workspaceId}`),
  get: (id: string) => request<{ repository: Repository; analyses: Analysis[] }>(`/repositories/${id}`),
  connect: (data: { workspace_id: string; github_repo_full_name: string; branch?: string }) =>
    request<Repository>("/repositories/connect", { method: "POST", body: JSON.stringify(data) }),
  analyze: (id: string) =>
    request<{ analysis_id: string; status: string }>(`/repositories/${id}/analyze`, { method: "POST" }),
  disconnect: (id: string) => request(`/repositories/${id}`, { method: "DELETE" }),
};

// ─── Analyses ─────────────────────────────────────────────────────────────────
export const analysesApi = {
  get: (id: string) => request<Analysis>(`/analyses/${id}`),
  graph: (id: string, params?: { node_type?: string; limit?: number }) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return request<GraphData>(`/analyses/${id}/graph${qs}`);
  },
  security: (id: string, severity?: string) => {
    const qs = severity ? `?severity=${severity}` : "";
    return request<SecurityData>(`/analyses/${id}/security${qs}`);
  },
  nodes: (id: string, params?: { node_type?: string; search?: string; limit?: number }) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return request<ArchNode[]>(`/analyses/${id}/nodes${qs}`);
  },
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportsApi = {
  generate: (data: {
    repository_id: string;
    analysis_id: string;
    report_type: string;
    export_format?: string;
  }) => request<{ report_id: string; status: string }>("/reports/generate", { method: "POST", body: JSON.stringify(data) }),
  listByRepo: (repoId: string) => request<Report[]>(`/reports/repository/${repoId}`),
  get: (id: string) => request<Report>(`/reports/${id}`),
  exportPdf: (id: string) => `${API_URL}/api/reports/${id}/export/pdf`,
  exportMarkdown: (id: string) => `${API_URL}/api/reports/${id}/export/markdown`,
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsApi = {
  list: (unreadOnly = false) =>
    request<Notification[]>(`/notifications/?unread_only=${unreadOnly}`),
  markRead: (id: string) =>
    request(`/notifications/${id}/read`, { method: "POST" }),
  markAllRead: () => request("/notifications/read-all", { method: "POST" }),
};

// ─── Payments ─────────────────────────────────────────────────────────────────
export const paymentsApi = {
  getBilling: (workspaceId: string) =>
    request<BillingData>(`/payments/workspace/${workspaceId}/billing`),
  createPayment: (data: { workspace_id: string; plan: string; pay_currency?: string }) =>
    request<PaymentResult>("/payments/create", { method: "POST", body: JSON.stringify(data) }),
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  github_username?: string;
  has_github: boolean;
  has_google: boolean;
  credits: number;
  created_at: string;
  last_login_at?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  owner_id: string;
  role: string;
  plan: string;
  members_count: number;
  created_at: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: string;
  joined_at: string;
}

export interface GithubRepo {
  id: number;
  full_name: string;
  name: string;
  description?: string;
  private: boolean;
  default_branch: string;
  language?: string;
  stars_count: number;
  size_kb: number;
}

export interface Repository {
  id: string;
  workspace_id: string;
  full_name: string;
  name: string;
  description?: string;
  private: boolean;
  default_branch: string;
  language?: string;
  stars_count: number;
  size_kb: number;
  is_active: boolean;
  last_synced_at?: string;
  created_at: string;
  latest_analysis_status?: string;
  analyses_count: number;
}

export interface Analysis {
  id: string;
  repository_id: string;
  status: string;
  progress_percent: number;
  branch: string;
  commit_sha?: string;
  files_parsed: number;
  nodes_extracted: number;
  edges_extracted: number;
  languages_detected?: Record<string, number>;
  tech_stack?: string[];
  ai_summary?: string;
  architecture_overview?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface GraphData {
  nodes: FlowNode[];
  edges: FlowEdge[];
  total_nodes: number;
  total_edges: number;
  languages: Record<string, number>;
  tech_stack: string[];
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    id: string;
    name: string;
    type: string;
    file_path?: string;
    line_start?: number;
    language?: string;
    color: string;
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
  data: { edge_type: string; weight: number };
  style: Record<string, unknown>;
}

export interface ArchNode {
  id: string;
  node_id: string;
  name: string;
  type: string;
  file_path?: string;
  line_start?: number;
  line_end?: number;
  language?: string;
}

export interface SecurityFinding {
  id: string;
  severity: string;
  category: string;
  title: string;
  description: string;
  file_path?: string;
  line_number?: number;
  recommendation?: string;
  is_resolved: boolean;
}

export interface SecurityData {
  findings: SecurityFinding[];
  summary: { total: number; critical: number; high: number; medium: number; low: number };
}

export interface Report {
  id: string;
  type: string;
  status: string;
  title: string;
  content?: string;
  export_format?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface BillingData {
  subscription: {
    plan: string;
    status: string;
    repositories_limit: number;
    analyses_per_month: number;
    reports_per_month: number;
    current_period_end?: string;
  };
  payments: Array<{ id: string; plan: string; amount_usd: number; status: string; created_at: string }>;
  available_plans: Array<{ id: string; name: string; price_usd: number; repositories: number; popular?: boolean }>;
}

export interface PaymentResult {
  payment_id: string;
  payment_url: string;
  pay_address?: string;
  pay_amount?: number;
  pay_currency: string;
  status: string;
}
