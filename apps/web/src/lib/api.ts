// ArchDefend — API Client
import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  User, Analysis, AnalysisReport, AnalysisRequest, AnalysisStartResponse,
  PricingPlan, CreditTransaction,
} from '@/types';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

class ArchDefendAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api/v1`,
      headers: { 'Content-Type': 'application/json' },
    });

    // Attach JWT token to every request
    // Reads from the Zustand persisted store key
    this.client.interceptors.request.use(config => {
      if (typeof window !== 'undefined') {
        // Try direct token first, then fall back to Zustand store
        let token = localStorage.getItem('archdefend_token');
        if (!token) {
          try {
            const store = JSON.parse(localStorage.getItem('archdefend-auth') || '{}');
            token = store?.state?.token || null;
          } catch {}
        }
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    // Handle 401 — redirect to login
    this.client.interceptors.response.use(
      res => res,
      (error: AxiosError) => {
        if (error.response?.status === 401 && typeof window !== 'undefined') {
          localStorage.removeItem('archdefend_token');
          window.location.href = '/auth/login?reason=session_expired';
        }
        return Promise.reject(error);
      },
    );
  }

  setToken(token: string | null) {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem('archdefend_token', token);
    } else {
      localStorage.removeItem('archdefend_token');
    }
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    // Try direct key first, then Zustand store
    const direct = localStorage.getItem('archdefend_token');
    if (direct) return direct;
    try {
      const store = JSON.parse(localStorage.getItem('archdefend-auth') || '{}');
      return store?.state?.token || null;
    } catch { return null; }
  }

  // ── Auth ────────────────────────────────────────────────────────────────────

  async signup(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const { data } = await this.client.post('/auth/signup', { email, password });
    this.setToken(data.access_token);
    return data;
  }

  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const { data } = await this.client.post('/auth/login', { email, password });
    this.setToken(data.access_token);
    return data;
  }

  logout() {
    this.setToken(null);
    window.location.href = '/';
  }

  getGitHubOAuthUrl(): string {
    return `${API_URL}/api/v1/auth/github`;
  }

  async getMe(): Promise<User> {
    const { data } = await this.client.get('/auth/me');
    return data;
  }

  // ── Analysis ────────────────────────────────────────────────────────────────

  async startAnalysis(request: AnalysisRequest): Promise<AnalysisStartResponse> {
    const { data } = await this.client.post('/analysis/start', request);
    return data;
  }

  async getAnalysisStatus(analysisId: string): Promise<Analysis> {
    const { data } = await this.client.get(`/analysis/${analysisId}/status`);
    return data;
  }

  async getAnalysisReport(analysisId: string): Promise<AnalysisReport> {
    const { data } = await this.client.get(`/analysis/${analysisId}/report`);
    return data;
  }

  async getAnalysisHistory(limit = 10, offset = 0): Promise<{ analyses: Analysis[] }> {
    const { data } = await this.client.get('/analysis/history', { params: { limit, offset } });
    return data;
  }

  streamAnalysisProgress(analysisId: string): EventSource {
    const token = this.getToken();
    return new EventSource(
      `${API_URL}/api/v1/analysis/${analysisId}/stream?token=${token}`,
    );
  }

  // ── Reports / Exports ────────────────────────────────────────────────────────

  getExportUrl(analysisId: string, format: 'pdf' | 'pptx' | 'markdown'): string {
    const token = this.getToken();
    return `${API_URL}/api/v1/reports/${analysisId}/${format}?token=${token}`;
  }

  async downloadExport(analysisId: string, format: 'pdf' | 'pptx' | 'markdown'): Promise<void> {
    const url = this.getExportUrl(analysisId, format);
    const a = document.createElement('a');
    a.href = url;
    a.download = `archdefend-${analysisId}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ── Billing ─────────────────────────────────────────────────────────────────

  async getPlans(): Promise<{ plans: PricingPlan[]; free: { credits: number } }> {
    const { data } = await this.client.get('/billing/plans');
    return data;
  }

  async createCheckout(plan: string, currency = 'usdtbsc'): Promise<{
    invoice_url: string;
    invoice_id: string;
    order_id: string;
    plan: string;
    amount_usd: number;
  }> {
    const { data } = await this.client.post('/billing/checkout', { plan, currency });
    return data;
  }

  async getCredits(): Promise<{ credits: number; plan: string; transactions: CreditTransaction[] }> {
    const { data } = await this.client.get('/billing/credits');
    return data;
  }

  // ── Health ──────────────────────────────────────────────────────────────────

  async health(): Promise<{ status: string }> {
    const { data } = await this.client.get('/health');
    return data;
  }

  // ── Error Helpers ────────────────────────────────────────────────────────────

  static getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string') return detail;
      if (typeof detail === 'object') return JSON.stringify(detail);
      return error.message;
    }
    if (error instanceof Error) return error.message;
    return 'An unexpected error occurred';
  }
}

export const api = new ArchDefendAPI();
export { ArchDefendAPI };
