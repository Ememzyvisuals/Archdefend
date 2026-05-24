'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import type { Analysis, AnalysisReport, StatusUpdate } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// useAnalysis — poll or stream a single analysis status
// ─────────────────────────────────────────────────────────────────────────────

export function useAnalysis(analysisId: string | null) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [status, setStatus] = useState<StatusUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!analysisId) return;

    // Initial fetch
    api.getAnalysisStatus(analysisId)
      .then(setAnalysis)
      .catch(e => setError(e.message));

    // Stream progress
    const es = api.streamAnalysisProgress(analysisId);
    esRef.current = es;

    es.onmessage = async (event) => {
      try {
        const data: StatusUpdate = JSON.parse(event.data);
        setStatus(data);

        if (data.done) {
          es.close();
          if (data.status === 'completed') {
            const r = await api.getAnalysisReport(analysisId);
            setReport(r);
          } else if (data.status === 'failed') {
            setError('Analysis failed. Credits have been refunded.');
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      // Fall back to polling
      const interval = setInterval(async () => {
        try {
          const a = await api.getAnalysisStatus(analysisId);
          setAnalysis(a);
          if (a.status === 'completed') {
            clearInterval(interval);
            const r = await api.getAnalysisReport(analysisId);
            setReport(r);
          } else if (a.status === 'failed') {
            clearInterval(interval);
            setError(a.error_message || 'Analysis failed');
          }
        } catch {
          clearInterval(interval);
        }
      }, 3000);
      return () => clearInterval(interval);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [analysisId]);

  return { analysis, report, status, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// useCredits — live credit balance with refresh
// ─────────────────────────────────────────────────────────────────────────────

export function useCredits() {
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState<string>('free');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCredits();
      setCredits(data.credits);
      setPlan(data.plan);
    } catch {
      // silently fail - auth might not be ready
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, []);

  return { credits, plan, loading, refresh };
}

// ─────────────────────────────────────────────────────────────────────────────
// useAnalysisHistory — paginated history
// ─────────────────────────────────────────────────────────────────────────────

export function useAnalysisHistory(limit = 10) {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async (offset = 0) => {
    setLoading(true);
    try {
      const data = await api.getAnalysisHistory(limit, offset);
      setAnalyses(data.analyses);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { fetch(); }, []);

  return { analyses, loading, refetch: fetch };
}

// ─────────────────────────────────────────────────────────────────────────────
// useThrottle — prevent rapid re-calls
// ─────────────────────────────────────────────────────────────────────────────

export function useThrottle<T>(value: T, delay: number): T {
  const [throttled, setThrottled] = useState(value);
  const lastUpdate = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    const remaining = delay - (now - lastUpdate.current);
    if (remaining <= 0) {
      lastUpdate.current = now;
      setThrottled(value);
    } else {
      const timer = setTimeout(() => {
        lastUpdate.current = Date.now();
        setThrottled(value);
      }, remaining);
      return () => clearTimeout(timer);
    }
  }, [value, delay]);

  return throttled;
}
