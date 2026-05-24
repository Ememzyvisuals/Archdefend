// ArchDefend — Global Zustand Store

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Analysis, AnalysisReport, StatusUpdate } from '@/types';
import { api } from '@/lib/api';

// ── Auth Store ────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      setUser: (user) => set({ user }),
      setToken: (token) => {
        set({ token });
        api.setToken(token);
      },

      logout: () => {
        set({ user: null, token: null });
        api.setToken(null);
        window.location.href = '/';
      },

      refreshUser: async () => {
        try {
          set({ isLoading: true });
          const user = await api.getMe();
          set({ user });
        } catch {
          set({ user: null, token: null });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'archdefend-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token }),
    },
  ),
);

// ── Analysis Store ─────────────────────────────────────────────────────────────

interface AnalysisState {
  // Active analysis
  activeAnalysisId: string | null;
  activeStatus: StatusUpdate | null;
  activeReport: AnalysisReport | null;
  isAnalyzing: boolean;
  analysisError: string | null;

  // History
  history: Analysis[];
  historyLoaded: boolean;

  // Actions
  setActiveAnalysis: (id: string | null) => void;
  setStatus: (status: StatusUpdate) => void;
  setReport: (report: AnalysisReport) => void;
  setAnalyzing: (v: boolean) => void;
  setError: (err: string | null) => void;
  clearActive: () => void;
  setHistory: (h: Analysis[]) => void;

  // Start full analysis flow
  startAnalysis: (repoUrl: string, options?: { security?: boolean; interview?: boolean }) => Promise<string>;
}

let eventSource: EventSource | null = null;

export const useAnalysisStore = create<AnalysisState>()((set, get) => ({
  activeAnalysisId: null,
  activeStatus: null,
  activeReport: null,
  isAnalyzing: false,
  analysisError: null,
  history: [],
  historyLoaded: false,

  setActiveAnalysis: (id) => set({ activeAnalysisId: id }),
  setStatus: (status) => set({ activeStatus: status }),
  setReport: (report) => set({ activeReport: report }),
  setAnalyzing: (v) => set({ isAnalyzing: v }),
  setError: (err) => set({ analysisError: err }),
  setHistory: (h) => set({ history: h, historyLoaded: true }),

  clearActive: () => {
    eventSource?.close();
    eventSource = null;
    set({
      activeAnalysisId: null,
      activeStatus: null,
      activeReport: null,
      isAnalyzing: false,
      analysisError: null,
    });
  },

  startAnalysis: async (repoUrl, options = {}) => {
    const { setAnalyzing, setError, setStatus, setActiveAnalysis, setReport } = get();

    setAnalyzing(true);
    setError(null);

    try {
      // Submit analysis job
      const response = await api.startAnalysis({
        repo_url: repoUrl,
        include_security: options.security ?? true,
        include_interview_prep: options.interview ?? true,
      });

      const { analysis_id } = response;
      setActiveAnalysis(analysis_id);

      // Stream progress via SSE
      eventSource?.close();
      eventSource = api.streamAnalysisProgress(analysis_id);

      return new Promise<string>((resolve, reject) => {
        if (!eventSource) return reject(new Error('SSE connection failed'));

        eventSource.onmessage = async (event) => {
          try {
            const data: StatusUpdate = JSON.parse(event.data);
            setStatus(data);

            if (data.done) {
              eventSource?.close();
              eventSource = null;

              if (data.status === 'completed') {
                // Fetch full report
                const report = await api.getAnalysisReport(analysis_id);
                setReport(report);
                setAnalyzing(false);
                resolve(analysis_id);
              } else if (data.status === 'failed') {
                setError('Analysis failed. Please try again.');
                setAnalyzing(false);
                reject(new Error('Analysis failed'));
              }
            }
          } catch (e) {
            console.error('SSE parse error:', e);
          }
        };

        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;
          setError('Lost connection to analysis server. Refreshing...');
          setAnalyzing(false);
          reject(new Error('SSE connection error'));
        };
      });
    } catch (err) {
      setAnalyzing(false);
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      setError(msg);
      throw err;
    }
  },
}));

// ── UI Store ──────────────────────────────────────────────────────────────────

interface UIState {
  sidebarOpen: boolean;
  activeTab: string;
  graphFullscreen: boolean;
  setSidebarOpen: (v: boolean) => void;
  setActiveTab: (tab: string) => void;
  setGraphFullscreen: (v: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  activeTab: 'overview',
  graphFullscreen: false,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setGraphFullscreen: (v) => set({ graphFullscreen: v }),
}));
