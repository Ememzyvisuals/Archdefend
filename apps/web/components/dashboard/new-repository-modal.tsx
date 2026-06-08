"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Github, Calendar, ChevronDown, Search, Lock, Star } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { repositoriesApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface NewRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function NewRepositoryModal({ isOpen, onClose, workspaceId }: NewRepositoryModalProps) {
  const [selectedRepo, setSelectedRepo] = useState("");
  const [repoSearch, setRepoSearch] = useState("");
  const [showRepoList, setShowRepoList] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: githubRepos, isLoading: loadingRepos } = useQuery({
    queryKey: ["github-repos"],
    queryFn: () => repositoriesApi.listGithub(),
    enabled: isOpen && !!user?.has_github,
    staleTime: 2 * 60 * 1000,
  });

  const filtered = githubRepos?.filter((r) =>
    r.full_name.toLowerCase().includes(repoSearch.toLowerCase())
  ) || [];

  const connectMutation = useMutation({
    mutationFn: (data: { workspace_id: string; github_repo_full_name: string; branch: string }) =>
      repositoriesApi.connect(data),
    onSuccess: (repo) => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
      toast.success(`${repo.name} connected! Analysis starting...`);
      onClose();
      router.push(`/dashboard/repositories/${repo.id}`);
    },
    onError: (err: any) => toast.error(err.message || "Failed to connect repository"),
  });

  const handleCreate = () => {
    if (!selectedRepo) { toast.error("Please select a repository"); return; }
    if (!workspaceId) { toast.error("No workspace found"); return; }
    connectMutation.mutate({ workspace_id: workspaceId, github_repo_full_name: selectedRepo, branch: "main" });
  };

  const selectedRepoData = githubRepos?.find((r) => r.full_name === selectedRepo);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm arch-card p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-bold text-white">New repository</h2>
                  <p className="text-xs text-white/35 mt-0.5">Select a repository to start analyzing.</p>
                </div>
                <button onClick={onClose}
                  className="p-1.5 rounded-full text-white/30 hover:text-white/70 transition-colors">
                  <X size={16} />
                </button>
              </div>

              {!user?.has_github ? (
                <div className="text-center py-6">
                  <Github size={32} className="mx-auto mb-3 text-white/20" />
                  <p className="text-sm font-medium text-white/60 mb-1">GitHub not connected</p>
                  <p className="text-xs text-white/30 mb-4">Sign in with GitHub to connect repositories.</p>
                  <a href="/api/auth/github">
                    <button className="btn-primary text-sm px-5 py-2.5 rounded-xl mx-auto">
                      Connect GitHub
                    </button>
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Repository selector */}
                  <div>
                    <label className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2 block">
                      REPOSITORY
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => setShowRepoList(!showRepoList)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm transition-all text-left"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: selectedRepo ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)",
                        }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <Github size={15} className="text-white/40 flex-shrink-0" />
                          <span className="truncate">
                            {selectedRepoData?.full_name || "Select a repository..."}
                          </span>
                        </div>
                        <ChevronDown size={14} className="text-white/30 flex-shrink-0" />
                      </button>

                      {showRepoList && (
                        <div className="absolute top-full left-0 right-0 mt-2 z-20 rounded-xl overflow-hidden"
                          style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.1)", maxHeight: 280 }}>
                          <div className="p-2 sticky top-0"
                            style={{ background: "#141414", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="relative">
                              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
                              <input autoFocus value={repoSearch} onChange={(e) => setRepoSearch(e.target.value)}
                                placeholder="Search repositories..."
                                className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-white placeholder:text-white/25 outline-none"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                                onClick={(e) => e.stopPropagation()} />
                            </div>
                          </div>
                          <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
                            {loadingRepos ? (
                              <div className="p-4 text-center text-xs text-white/30">Loading...</div>
                            ) : filtered.length === 0 ? (
                              <div className="p-4 text-center text-xs text-white/30">No repositories found</div>
                            ) : (
                              filtered.map((repo) => (
                                <button key={repo.full_name}
                                  onClick={() => { setSelectedRepo(repo.full_name); setShowRepoList(false); setRepoSearch(""); }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all"
                                  style={{ background: selectedRepo === repo.full_name ? "rgba(99,102,241,0.1)" : "transparent" }}
                                  onMouseEnter={(e) => { if (selectedRepo !== repo.full_name) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                                  onMouseLeave={(e) => { if (selectedRepo !== repo.full_name) e.currentTarget.style.background = "transparent"; }}>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-white truncate">{repo.full_name}</p>
                                    {repo.description && (
                                      <p className="text-[11px] text-white/30 truncate">{repo.description}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {repo.private && <Lock size={10} className="text-white/25" />}
                                    {repo.stars_count > 0 && (
                                      <span className="flex items-center gap-0.5 text-[10px] text-white/25">
                                        <Star size={9} /> {repo.stars_count}
                                      </span>
                                    )}
                                    {repo.language && (
                                      <span className="text-[10px] text-white/25">{repo.language}</span>
                                    )}
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Start date */}
                  <div>
                    <label className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2 block">
                      ANALYSIS START DATE
                    </label>
                    <p className="text-[11px] text-white/25 mb-2">Baseline for drift detection.</p>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-3 rounded-xl text-sm text-white outline-none"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", colorScheme: "dark" }} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button onClick={onClose}
                      className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                      Cancel
                    </button>
                    <button onClick={handleCreate}
                      disabled={!selectedRepo || connectMutation.isPending}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                      style={{ background: selectedRepo ? "rgba(99,102,241,0.9)" : "rgba(255,255,255,0.06)", color: "white" }}>
                      {connectMutation.isPending ? "Connecting..." : "Create project"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
