// Shared types for ArchDefend monorepo

export type AnalysisStatus =
  | "queued"
  | "cloning"
  | "parsing"
  | "graphing"
  | "ai_processing"
  | "completed"
  | "failed";

export type NodeType =
  | "module"
  | "class"
  | "function"
  | "api_endpoint"
  | "database"
  | "service"
  | "external";

export type EdgeType =
  | "imports"
  | "calls"
  | "extends"
  | "implements"
  | "depends_on"
  | "http_call";

export type ReportType =
  | "architecture_overview"
  | "onboarding"
  | "interview_defense"
  | "dependency_analysis"
  | "scalability"
  | "technical_debt"
  | "security";

export type SubscriptionPlan = "free" | "starter" | "pro" | "enterprise";
export type UserRole = "owner" | "admin" | "member" | "viewer";
export type SecuritySeverity = "critical" | "high" | "medium" | "low" | "info";

export interface PlanLimits {
  repositories_limit: number;
  analyses_per_month: number;
  reports_per_month: number;
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free:       { repositories_limit: 1,    analyses_per_month: 5,    reports_per_month: 5 },
  starter:    { repositories_limit: 3,    analyses_per_month: 30,   reports_per_month: 30 },
  pro:        { repositories_limit: 20,   analyses_per_month: 200,  reports_per_month: 100 },
  enterprise: { repositories_limit: 9999, analyses_per_month: 9999, reports_per_month: 9999 },
};

export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  free: 0,
  starter: 19,
  pro: 49,
  enterprise: 149,
};
