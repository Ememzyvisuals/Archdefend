"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import { Shield, AlertCircle, AlertTriangle, Info, CheckCircle2, ChevronRight } from "lucide-react";
import { repositoriesApi, analysesApi, workspacesApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

const SEV_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  critical: { icon: AlertCircle,   color: "#ef4444", bg: "rgba(239,68,68,0.1)",   label: "Critical" },
  high:     { icon: AlertTriangle, color: "#f97316", bg: "rgba(249,115,22,0.1)",  label: "High" },
  medium:   { icon: AlertTriangle, color: "#eab308", bg: "rgba(234,179,8,0.1)",   label: "Medium" },
  low:      { icon: Info,          color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  label: "Low" },
  info:     { icon: Info,          color: "#6b7280", bg: "rgba(107,114,128,0.1)", label: "Info" },
};

export default function SecurityPage() {
  const { isAuthenticated } = useAuthStore();

  const { data: workspaces } = useQuery({
    queryKey: ["workspaces"],
    queryFn: workspacesApi.list,
    enabled: isAuthenticated,
  });
  const workspace = workspaces?.[0];

  const { data: repos } = useQuery({
    queryKey: ["repositories", workspace?.id],
    queryFn: () => repositoriesApi.listWorkspace(workspace!.id),
    enabled: !!workspace?.id,
  });

  const analyzedRepos = repos?.filter((r) => r.latest_analysis_status === "completed") || [];

  return (
    <div className="p-4 pb-12 space-y-5">
      <div>
        <h1 className="text-lg font-bold text-white">Security Center</h1>
        <p className="text-sm text-white/35">Architecture security findings across all repositories.</p>
      </div>

      {analyzedRepos.length === 0 ? (
        <div className="arch-card p-12 text-center">
          <Shield size={36} className="mx-auto mb-3 text-white/15" />
          <p className="text-sm font-semibold text-white/40">No analyzed repositories</p>
          <p className="text-xs text-white/25 mt-1">
            Connect and analyze a repository to see security findings here.
          </p>
          <Link href="/dashboard/repositories">
            <button className="mt-5 btn-primary text-sm px-5 py-2.5 rounded-xl mx-auto">
              Connect repository
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary header */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Repositories scanned", val: analyzedRepos.length, color: "#6366f1" },
              { label: "Scan coverage", val: `${Math.round((analyzedRepos.length / (repos?.length || 1)) * 100)}%`, color: "#10b981" },
            ].map((s) => (
              <div key={s.label} className="metric-card">
                <p className="text-xs text-white/35 mb-1">{s.label}</p>
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.val}</p>
              </div>
            ))}
          </div>

          {/* Repo security cards */}
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider pt-1">
            By repository
          </p>
          {analyzedRepos.map((repo, i) => (
            <motion.div
              key={repo.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link href={`/dashboard/repositories/${repo.id}?tab=security`}>
                <div className="arch-card-hover p-4 cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{
                        background: `hsl(${repo.name.charCodeAt(0) * 15 % 360},55%,18%)`,
                        color: `hsl(${repo.name.charCodeAt(0) * 15 % 360},80%,72%)`,
                      }}
                    >
                      {repo.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{repo.name}</p>
                      <p className="text-xs text-white/35 truncate">{repo.full_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="status-active text-[11px]">
                        <CheckCircle2 size={10} /> Scanned
                      </span>
                      <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
                    </div>
                  </div>
                  <p className="text-xs text-white/25 mt-2 ml-13">
                    View security findings →
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}

          {/* Info box */}
          <div className="p-4 rounded-xl text-xs text-white/30 leading-relaxed"
            style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.1)" }}>
            🔍 Security scanning runs automatically with every analysis. Findings include secret exposure,
            vulnerable patterns, circular dependencies, and unsafe architecture practices detected by AI.
          </div>
        </div>
      )}
    </div>
  );
}
