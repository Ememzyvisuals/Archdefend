"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Plus, ArrowRight, GitBranch, Cpu, BarChart3,
  Shield, Clock, CheckCircle2, AlertCircle, Loader2,
  Github, RefreshCw, Search, MoreVertical, Lock, Star
} from "lucide-react";
import { repositoriesApi, workspacesApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { NewRepositoryModal } from "@/components/dashboard/new-repository-modal";
import { AnimatedDriftChart } from "@/components/landing/animated-illustrations";
import { formatDistanceToNow } from "date-fns";

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
      {chart && (
        <div className="mt-3">
          <AnimatedDriftChart />
        </div>
      )}
    </div>
  );
}

function AnalysisStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: any; cls: string }> = {
    completed:    { label: "Analyzed",   icon: CheckCircle2, cls: "status-active" },
    queued:       { label: "Queued",     icon: Clock,        cls: "status-queued" },
    cloning:      { label: "Cloning",    icon: Loader2,      cls: "status-queued" },
    parsing:      { label: "Parsing",    icon: Loader2,      cls: "status-queued" },
    ai_processing:{ label: "Processing", icon: Loader2,      cls: "status-queued" },
    failed:       { label: "Failed",     icon: AlertCircle,  cls: "status-error" },
  };
  const cfg = map[status] || { label: status, icon: Clock, cls: "status-inactive" };
  return (
    <span className={cfg.cls}>
      <cfg.icon size={11} className={status.includes("ing") ? "animate-spin" : ""} />
      {cfg.label}
    </span>
  );
}

function LanguageDot({ lang }: { lang?: string }) {
  const colors: Record<string, string> = {
    Python: "#3572A5", TypeScript: "#2b7489", JavaScript: "#f1e05a",
    Rust: "#dea584", Go: "#00ADD8", Java: "#b07219",
    Ruby: "#701516", Swift: "#ffac45", Kotlin: "#A97BFF",
  };
  const color = colors[lang || ""] || "#6366f1";
  return <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />;
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
    refetchInterval: (data) =>
      data?.some((r) => ["queued","cloning","parsing","ai_processing"].includes(r.latest_analysis_status || ""))
        ? 5000 : false,
  });

  const filtered = repositories?.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    r.description?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const totalAnalyses = repositories?.reduce((a, r) => a + r.analyses_count, 0) || 0;
  const completedRepos = repositories?.filter((r) => r.latest_analysis_status === "completed").length || 0;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="p-4 pb-10 space-y-5">
      {/* Date */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-xs text-white/25">{today}</span>
      </div>

      {/* Overview hero card - matches screenshot */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden p-6"
        style={{
          background: "linear-gradient(135deg, #0d0d1a 0%, #111128 60%, #0a0a18 100%)",
          border: "1px solid rgba(99,102,241,0.15)",
          minHeight: 180,
        }}
      >
        {/* Star field */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-px h-px rounded-full bg-white"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.4 + 0.1,
            }}
            animate={{ opacity: [0.1, 0.6, 0.1] }}
            transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2 }}
          />
        ))}
        <div className="relative z-10">
          <p className="text-[11px] text-white/35 uppercase tracking-widest font-medium mb-2">OVERVIEW</p>
          <h1 className="text-2xl font-bold text-white leading-tight mb-5">
            Know your architecture.<br />Ship with confidence.
          </h1>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setNewRepoOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white text-black hover:bg-white/92 transition-all"
            >
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
            <p>
              <span className="text-white font-medium">{repositories?.length || 0} repositories</span>
              {" "}connected this workspace.
            </p>
            <p>
              <span className="text-white font-medium">{totalAnalyses} analyses</span>
              {" "}run total.
            </p>
            <p className="text-white/25">
              {completedRepos} repositories fully analyzed.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats grid - matching metric cards in screenshots */}
      <div className="grid grid-cols-1 gap-3">
        <StatCard
          label="Analyses run"
          value={totalAnalyses}
          delta="0% vs last month"
          icon={Cpu}
          chart
        />
        <StatCard
          label="Nodes extracted"
          value={repositories?.reduce((a, r) => a, 0) || 0}
          delta="0% vs last month"
          icon={GitBranch}
          chart
        />
        <StatCard
          label="Repositories"
          value={repositories?.length || 0}
          delta={`+${repositories?.length || 0} total`}
          icon={GitBranch}
          chart
        />
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
              {user?.has_github ? (
                <span className="status-active">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Connected
                </span>
              ) : (
                <span className="status-inactive">Not connected</span>
              )}
            </div>
            <p className="text-xs text-white/35">
              {user?.has_github
                ? `Connected as @${user.github_username}. Track repos across all workspaces.`
                : "Connect GitHub to start analyzing repositories."}
            </p>
            {user?.has_github && (
              <div className="flex gap-2 mt-3">
                <button onClick={() => setNewRepoOpen(true)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}>
                  Connect repo
                </button>
                <button
                  className="text-xs px-3 py-1.5 rounded-lg font-medium text-red-400 transition-all"
                  style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)" }}>
                  Disconnect
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

        {/* Search */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repositories..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-white/25 outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          />
          <button onClick={() => setNewRepoOpen(true)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-white/06 border border-white/08 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
            <Plus size={14} />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl shimmer" />
            ))}
          </div>
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
              <motion.div
                key={repo.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/dashboard/repositories/${repo.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer group"
                    style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                    }}>
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
                      style={{
                        background: `hsl(${repo.name.charCodeAt(0) * 15 % 360}, 60%, 25%)`,
                        color: `hsl(${repo.name.charCodeAt(0) * 15 % 360}, 80%, 75%)`,
                      }}>
                      {repo.name[0].toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{repo.name}</p>
                        {repo.private && <Lock size={11} className="text-white/25 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-white/35 truncate">{repo.full_name}</p>
                    </div>
                    {/* Status + lang */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <AnalysisStatusBadge status={repo.latest_analysis_status || "none"} />
                      <div className="flex items-center gap-1">
                        <LanguageDot lang={repo.language} />
                        <span className="text-[11px] text-white/25">{repo.language || "—"}</span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <NewRepositoryModal
        isOpen={newRepoOpen}
        onClose={() => setNewRepoOpen(false)}
        workspaceId={workspace?.id || ""}
      />
    </div>
  );
}

function ChevronRight({ size, className }: any) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
