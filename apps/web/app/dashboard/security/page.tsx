"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import { Shield, CheckCircle2, ChevronRight } from "lucide-react";
import { repositoriesApi, workspacesApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

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
          <div className="grid grid-cols-2 gap-3">
            <div className="metric-card">
              <p className="text-xs text-white/35 mb-1">Repositories scanned</p>
              <p className="text-2xl font-bold text-brand-400">{analyzedRepos.length}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs text-white/35 mb-1">Scan coverage</p>
              <p className="text-2xl font-bold text-green-400">
                {Math.round((analyzedRepos.length / Math.max(repos?.length || 1, 1)) * 100)}%
              </p>
            </div>
          </div>

          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider pt-1">
            By repository
          </p>

          {analyzedRepos.map((repo, i) => (
            <motion.div key={repo.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}>
              <Link href={`/dashboard/repositories/${repo.id}`}>
                <div className="arch-card-hover p-4 cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{
                        background: `hsl(${repo.name.charCodeAt(0) * 15 % 360},55%,18%)`,
                        color: `hsl(${repo.name.charCodeAt(0) * 15 % 360},80%,72%)`,
                      }}>
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
                </div>
              </Link>
            </motion.div>
          ))}

          <div className="p-4 rounded-xl text-xs text-white/30 leading-relaxed"
            style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.1)" }}>
            🔍 Security scanning runs automatically with every analysis. Click a repository to view detailed findings.
          </div>
        </div>
      )}
    </div>
  );
}
