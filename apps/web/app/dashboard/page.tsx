"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Plus, ArrowRight, GitBranch, Cpu,
  CheckCircle2, AlertCircle, Loader2, Clock,
  Github, RefreshCw, Search, Lock
} from "lucide-react";
import { repositoriesApi, workspacesApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { NewRepositoryModal } from "@/components/dashboard/new-repository-modal";
import { AnimatedDriftChart } from "@/components/landing/animated-illustrations";
import { getLanguageColor } from "@/lib/utils";

function StatCard({ label, value, delta, icon: Icon, chart }: {
  label: string; value: string | number; delta?: string; icon: any; chart?: boolean;
}) {
  return (
    <div className="metric-card">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className="text-white/30" />
        <span className="text-xs text-white/40">{label}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {delta && <p className="text-xs text-white/30 mt-1">{delta}</p>}
      {chart && <div className="mt-3"><AnimatedDriftChart /></div>}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; icon: any; cls: string }> = {
    completed:     { label: "Analyzed",    icon: CheckCircle2, cls: "status-active" },
    queued:        { label: "Queued",      icon: Clock,        cls: "status-queued" },
    cloning:       { label: "Cloning",     icon: Loader2,      cls: "status-queued" },
    parsing:       { label: "Parsing",     icon: Loader2,      cls: "status-queued" },
    ai_processing: { label: "Processing",  icon: Loader2,      cls: "status-queued" },
    failed:        { label: "Failed",      icon: AlertCircle,  cls: "status-error" },
  };
  const cfg = map[status || ""] || { label: "Not analyzed", icon: Clock, cls: "status-inactive" };
  const spinning = ["cloning","parsing","ai_processing","queued"].includes(status || "");
  return (
    <span className={cfg.cls}>
      <cfg.icon size={11} className={spinning ? "animate-spin" : ""} />
      {cfg.label}
    </span>
  );
}

export default function DashboardPage() {
  const [newRepoOpen, setNewRepoOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { user, isAuthenticated } = useAuthStore();

  const { data: workspaces } = useQuery({
    queryKey: ["workspaces"],
    queryFn: workspacesApi.list,
    enabled: isAuthenticated,
  });
  const workspace = workspaces?.[0];

  const { data: repositories, isLoading, refetch } = useQuery({
    queryKey: ["repositories", workspace?.id],
    queryFn: () => repositoriesApi.listWorkspace(workspace!.id),
    enabled: !!workspace?.id,
    refetchInterval: (query) => {
      const data = query.state.data as any[];
      return data?.some((r: any) =>
        ["queued","cloning","parsing","ai_processing"].includes(r.latest_analysis_status || "")
      ) ? 5000 : false;
    },
  });

  const filtered = repositories?.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || "").toLowerCase().includes(search.toLowerCase())
  ) || [];

  const totalAnalyses = repositories?.reduce((a, r) => a + r.analyses_count, 0) || 0;
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div className="p-4 pb-10 space-y-5">
      <div className="flex items-center gap-2 pt-1">
        <span className="text-xs text-white/25">{today}</span>
      </div>

      {/* Hero overview card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden p-6"
        style={{ background: "linear-gradient(135deg,#0d0d1a 0%,#111128 60%,#0a0a18 100%)",
          border: "1px solid rgba(99,102,241,0.15)", minHeight: 180 }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div key={i} className="absolute w-px h-px rounded-full bg-white"
            style={{ left: `${(i * 17 + 5) % 100}%`, top: `${(i * 23 + 3) % 100}%`, opacity: 0.2 }}
            animate={{ opacity: [0.1, 0.5, 0.1] }}
            transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: i * 0.1 }} />
        ))}
        <div className="relative z-10">
          <p className="text-[11px] text-white/35 uppercase tracking-widest font-medium mb-2">OVERVIEW</p>
          <h1 className="text-2xl font-bold text-white leading-tight mb-5">
            Know your architecture.<br />Ship with confidence.
          </h1>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => setNewRepoOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white text-black hover:bg-white/92 transition-all">
              <Plus size={15} /> New repository
            </button>
            <Link href="/dashboard/repositories">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)" }}>
                View all <ArrowRight size={14} />
              </button>
            </Link>
          </div>
          <div className="mt-5 text-xs text-white/35 space-y-0.5">
            <p><span className="text-white font-medium">{repositories?.length || 0} repositories</span> connected.</p>
            <p><span className="text-white font-medium">{totalAnalyses} analyses</span> run total.</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3">
        <StatCard label="Analyses run"       value={totalAnalyses}            delta="This workspace" icon={Cpu}       chart />
        <StatCard label="Repositories"       value={repositories?.length || 0} delta="Connected"      icon={GitBranch} chart />
      </div>

      {/* GitHub connection card */}
      <div className="arch-card p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/06 border border-white/08 flex items-center justify-center flex-shrink-0">
            <Github size={16} className="text-white/70" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-white">GitHub</span>
              {user?.has_github
                ? <span className="status-active"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Connected</span>
                : <span className="status-inactive">Not connected</span>}
            </div>
            <p className="text-xs text-white/35">
              {user?.has_github
                ? `Connected as @${user.github_username}`
                : "Connect GitHub to start analyzing repositories."}
            </p>
            {user?.has_github && (
              <div className="flex gap-2 mt-3">
                <button onClick={() => setNewRepoOpen(true)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}>
                  Connect repo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Repositories list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white/70">Your repositories</h2>
          <button onClick={() => refetch()} className="p-1.5 text-white/30 hover:text-white/60 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repositories..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-white/25 outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
          <button onClick={() => setNewRepoOpen(true)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-white/06 border border-white/08 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
            <Plus size={14} />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-16 rounded-xl shimmer" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="arch-card p-10 text-center">
            <GitBranch size={32} className="mx-auto mb-3 text-white/15" />
            <p className="text-sm font-medium text-white/40">No repositories yet</p>
            <p className="text-xs text-white/25 mt-1">Connect your first GitHub repository to get started.</p>
            <button onClick={() => setNewRepoOpen(true)}
              className="mt-4 btn-primary text-sm px-5 py-2.5 rounded-xl mx-auto">
              + New repository
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((repo, i) => (
              <motion.div key={repo.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}>
                <Link href={`/dashboard/repositories/${repo.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer group"
                    style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
                      style={{ background: `hsl(${repo.name.charCodeAt(0)*15%360},60%,20%)`, color: `hsl(${repo.name.charCodeAt(0)*15%360},80%,72%)` }}>
                      {repo.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{repo.name}</p>
                        {repo.private && <Lock size={11} className="text-white/25 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-white/35 truncate">{repo.full_name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <StatusBadge status={repo.latest_analysis_status} />
                      <div className="flex items-center gap-1">
                        {repo.language && (
                          <>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getLanguageColor(repo.language) }} />
                            <span className="text-[11px] text-white/25">{repo.language}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
                      className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0">
                      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <NewRepositoryModal isOpen={newRepoOpen} onClose={() => setNewRepoOpen(false)} workspaceId={workspace?.id || ""} />
    </div>
  );
}
