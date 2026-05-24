// ArchDefend — Shared TypeScript Types

export type PlanTier = 'free' | 'pro' | 'team';
export type AnalysisStatus = 'pending' | 'cloning' | 'parsing' | 'analyzing' | 'generating' | 'completed' | 'failed';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type ExportFormat = 'pdf' | 'pptx' | 'markdown' | 'html';

export interface User {
  id: string;
  email: string;
  github_username?: string;
  avatar_url?: string;
  plan: PlanTier;
  credits: number;
  is_verified: boolean;
}

export interface Analysis {
  id: string;
  repo_url: string;
  repo_name?: string;
  repo_owner?: string;
  status: AnalysisStatus;
  credits_used: number;
  progress_pct: number;
  file_count?: number;
  language_stats?: Record<string, number>;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface SecurityFinding {
  id: string;
  severity: Severity;
  title?: string;
  description: string;
  cwe?: string;
  file: string;
  line?: number;
  snippet?: string;
  remediation?: string;
  owasp?: string;
}

export interface APIRoute {
  method: string;
  path: string;
  framework?: string;
  file?: string;
}

export interface InterviewQuestion {
  question: string;
  category: string;
  difficulty: 'medium' | 'hard' | 'expert';
  expected_answer: string;
  follow_up?: string;
}

export interface Recommendation {
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description: string;
  effort: string;
  impact: string;
}

export interface GraphNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    fullPath: string;
    language: string;
    lineCount: number;
    hasTests: boolean;
    color: string;
    connections: number;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  animated: boolean;
  type: string;
}

export interface AnalysisReport {
  analysis_id: string;
  repo_url: string;
  repo_name?: string;
  language_stats?: Record<string, number>;
  file_count?: number;
  architecture_summary?: string;
  dependency_graph?: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  security_findings?: SecurityFinding[];
  api_inventory?: APIRoute[];
  scalability_score?: number;
  production_readiness_score?: number;
  interview_questions?: InterviewQuestion[];
  tech_stack?: string[];
  recommendations?: Recommendation[];
  completed_at?: string;
}

export interface CreditTransaction {
  amount: number;
  balance_after: number;
  reason: string;
  created_at: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price_usd: number;
  credits: number;
  description: string;
}

export interface AnalysisRequest {
  repo_url: string;
  branch?: string;
  include_security?: boolean;
  include_interview_prep?: boolean;
}

export interface AnalysisStartResponse {
  analysis_id: string;
  status: string;
  credits_required: number;
  credits_remaining: number;
  message: string;
}

export interface StatusUpdate {
  status: AnalysisStatus;
  progress: number;
  message: string;
  done?: boolean;
}
