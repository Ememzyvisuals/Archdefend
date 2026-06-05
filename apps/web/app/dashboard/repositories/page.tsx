"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Plus, Search, GitBranch, Lock, Star,
  RefreshCw, Clock, CheckCircle2, AlertCircle, Loader2, ChevronRight
} from "lucide-react";
import { repositoriesApi, workspacesApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { NewRepositoryModal } from "@/components/dashboard/new-repository-modal";
import { formatDistanceToNow } from "date-fns";
import { getLanguageColor } from "@/lib/utils";

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; icon: any; cls: string }> = {
    completed:     { label: "Analyzed",    icon: CheckCircle2, cls: "status-active" },
    queued:        { label: "Queued",      icon: Clock,        cls: "status-queued" },
    cloning:       { label: "Cloning",     icon: Loader2,      cls: "status-queued" },
    parsing:       { label: "Parsing",     icon: Loader2,      cls: "status-queued" },
    ai_processing: { label: "AI Processing", icon: Loader2,    cls: "status-queued" },
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

export default function RepositoriesPage() {
  const [search, setSearch] = useState("");
  const [newRepoOpen, setNewRepoOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();

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
      data?.some((r) =>
        ["queued","cloning","parsing","ai_processing"].includes(r.latest_analysis_status || "")
      ) ? 5000 : false,
  });

  const filtered = repositories?.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.language || "").toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="p-4 pb-12 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Repositories</h1>
          <p className="text-sm text-white/35">
            {repositories?.length || 0} connected
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()}
            className="p-2 rounded-xl text-white/30 hover:text-white/60 transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setNewRepoOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white text-black hover:bg-white/92 transition-all">
            <Plus size={15} /> New
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search repositories..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-white/25 outline-none"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4].map((i) => <div key={i} className="h-20 rounded-2xl shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="arch-card p-12 text-center">
          <GitBranch size={36} className="mx-auto mb-3 text-white/15" />
          <p className="text-sm font-semibold text-white/40">
            {search ? "No repositories match your search" : "No repositories connected yet"}
          </p>
          <p className="text-xs text-white/25 mt-1">
            {search ? "Try a different search term." : "Connect your first GitHub repository to start analyzing."}
          </p>
          {!search && (
            <button onClick={() => setNewRepoOpen(true)}
              className="mt-5 btn-primary text-sm px-5 py-2.5 rounded-xl mx-auto">
              + Connect repository
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((repo, i) => (
            <motion.div
              key={repo.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link href={`/dashboard/repositories/${repo.id}`}>
                <div className="arch-card-hover p-4 cursor-pointer group">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{
                        background: `hsl(${repo.name.charCodeAt(0) * 15 % 360},55%,18%)`,
                        color: `hsl(${repo.name.charCodeAt(0) * 15 % 360},80%,72%)`,
                      }}
                    >
                      {repo.name[0].toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-white truncate">{repo.name}</p>
                        {repo.private && <Lock size={11} className="text-white/25 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-white/35 truncate mb-2">{repo.full_name}</p>
                      {repo.description && (
                        <p className="text-xs text-white/30 truncate mb-2">{repo.description}</p>
                      )}
                      <div className="flex items-center gap-3 flex-wrap">
                        <StatusBadge status={repo.latest_analysis_status} />
                        {repo.language && (
                          <span className="flex items-center gap-1.5 text-[11px] text-white/30">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getLanguageColor(repo.language) }}
                            />
                            {repo.language}
                          </span>
                        )}
                        {repo.stars_count > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-white/25">
                            <Star size={10} /> {repo.stars_count}
                          </span>
                        )}
                        <span className="text-[11px] text-white/20">
                          {repo.created_at
                            ? formatDistanceToNow(new Date(repo.created_at), { addSuffix: true })
                            : ""}
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight
                      size={16}
                      className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0 mt-1"
                    />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <NewRepositoryModal
        isOpen={newRepoOpen}
        onClose={() => setNewRepoOpen(false)}
        workspaceId={workspace?.id || ""}
      />
    </div>
  );
}
