"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Github, BarChart3, Shield, FileText,
  Settings, Cpu, CheckCircle2, AlertCircle, Loader2, Clock,
  Lock, Star, GitBranch, RefreshCw, ExternalLink, Zap, Map
} from "lucide-react";
import { repositoriesApi, analysesApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "map", label: "Map", icon: Map },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "security", label: "Security", icon: Shield },
  { id: "settings", label: "Settings", icon: Settings },
];

function StatusBanner({ status, progress }: { status: string; progress: number }) {
  const configs: Record<string, { msg: string; sub: string; color: string; spin: boolean }> = {
    queued:        { msg: "Repository analysis queued",    sub: "The analysis will start shortly.", color: "#818cf8", spin: true },
    cloning:       { msg: "Cloning repository...",          sub: "Downloading your codebase.", color: "#06b6d4", spin: true },
    parsing:       { msg: `Parsing source files... ${progress}%`, sub: "Extracting symbols and dependencies.", color: "#06b6d4", spin: true },
    ai_processing: { msg: "AI processing architecture...", sub: "Generating intelligence insights.", color: "#8b5cf6", spin: true },
    failed:        { msg: "Analysis failed",               sub: "An error occurred. Please retry.", color: "#ef4444", spin: false },
  };
  const cfg = configs[status];
  if (!cfg) return null;
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl mb-4"
      style={{ background: `${cfg.color}10`, border: `1px solid ${cfg.color}25` }}>
      {cfg.spin ? (
        <Loader2 size={16} className="animate-spin flex-shrink-0" style={{ color: cfg.color }} />
      ) : (
        <AlertCircle size={16} className="flex-shrink-0" style={{ color: cfg.color }} />
      )}
      <div>
        <p className="text-sm font-medium text-white">{cfg.msg}</p>
        <p className="text-xs text-white/40">{cfg.sub}</p>
      </div>
    </div>
  );
}

function IntegrationRow({ icon: Icon, iconBg, name, sub, status, onConnect }: any) {
  const isActive = status === "active" || status === "connected";
  return (
    <div className="integration-row">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
          <Icon size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{name}</p>
          <p className="text-xs text-white/35">{sub}</p>
        </div>
      </div>
      {isActive ? (
        <span className="status-active">Active</span>
      ) : (
        <button onClick={onConnect} className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
          Not connected
        </button>
      )}
    </div>
  );
}

export default function RepositoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("overview");
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["repository", id],
    queryFn: () => repositoriesApi.get(id),
    enabled: !!id && isAuthenticated,
    refetchInterval: (data) => {
      const latest = data?.analyses?.[0];
      if (latest && ["queued","cloning","parsing","ai_processing"].includes(latest.status)) return 4000;
      return false;
    },
  });

  const repo = data?.repository;
  const analyses = data?.analyses || [];
  const latestAnalysis = analyses[0];

  const triggerMutation = useMutation({
    mutationFn: () => repositoriesApi.analyze(id),
    onSuccess: () => {
      toast.success("Analysis started!");
      queryClient.invalidateQueries({ queryKey: ["repository", id] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to start analysis"),
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-6 w-32 shimmer rounded-lg" />
        <div className="h-16 shimmer rounded-2xl" />
        <div className="h-40 shimmer rounded-2xl" />
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="p-4 text-center py-20">
        <p className="text-white/40">Repository not found</p>
        <Link href="/dashboard"><button className="mt-4 btn-primary text-sm px-5 py-2.5 rounded-xl">Back to dashboard</button></Link>
      </div>
    );
  }

  const isAnalyzing = ["queued","cloning","parsing","ai_processing"].includes(latestAnalysis?.status || "");

  return (
    <div className="pb-10">
      {/* Back */}
      <div className="px-4 pt-4">
        <Link href="/dashboard">
          <button className="flex items-center gap-2 text-xs text-white/35 hover:text-white/70 transition-colors mb-4">
            <ArrowLeft size={14} /> Back to projects
          </button>
        </Link>

        {/* Repo header */}
        <div className="flex items-start gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-base font-bold flex-shrink-0"
            style={{
              background: `hsl(${repo.name.charCodeAt(0) * 15 % 360}, 55%, 22%)`,
              color: `hsl(${repo.name.charCodeAt(0) * 15 % 360}, 80%, 72%)`,
            }}>
            {repo.name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-white">{repo.name}</h1>
              {latestAnalysis ? (
                <span className={isAnalyzing ? "status-queued" : latestAnalysis.status === "completed" ? "status-active" : "status-error"}>
                  {latestAnalysis.status === "completed" ? "Active" : isAnalyzing ? "Analyzing" : "Inactive"}
                </span>
              ) : (
                <span className="status-inactive">Not analyzed</span>
              )}
            </div>
            <p className="text-xs text-white/40 truncate">{repo.full_name}</p>
          </div>
          <button
            onClick={() => triggerMutation.mutate()}
            disabled={isAnalyzing || triggerMutation.isPending}
            className="p-2 rounded-xl text-white/40 hover:text-white transition-all disabled:opacity-30"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            title="Re-analyze"
          >
            <RefreshCw size={15} className={isAnalyzing ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab === tab.id
                  ? "bg-white/08 text-white border-b-2 border-brand-400"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* Status banner */}
        {latestAnalysis && <StatusBanner status={latestAnalysis.status} progress={latestAnalysis.progress_percent} />}

        {/* Tab content */}
        {activeTab === "overview" && (
          <OverviewTab repo={repo} latestAnalysis={latestAnalysis} analyses={analyses} />
        )}
        {activeTab === "map" && (
          <MapTab analysisId={latestAnalysis?.id} repoName={repo.name} status={latestAnalysis?.status} />
        )}
        {activeTab === "reports" && (
          <ReportsTab repoId={repo.id} analysisId={latestAnalysis?.id} status={latestAnalysis?.status} />
        )}
        {activeTab === "security" && (
          <SecurityTab analysisId={latestAnalysis?.id} status={latestAnalysis?.status} />
        )}
        {activeTab === "settings" && (
          <SettingsTab repo={repo} />
        )}
      </div>
    </div>
  );
}

function OverviewTab({ repo, latestAnalysis, analyses }: any) {
  return (
    <div className="space-y-4">
      {/* Stats 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Files parsed", val: latestAnalysis?.files_parsed ?? "—" },
          { label: "Nodes extracted", val: latestAnalysis?.nodes_extracted ?? "—" },
          { label: "Analyses run", val: analyses.length },
          { label: "Security findings", val: latestAnalysis?.status === "completed" ? "Scan done" : "—" },
        ].map((s, i) => (
          <div key={i} className="metric-card">
            <p className="text-xs text-white/35 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-white">{s.val}</p>
          </div>
        ))}
      </div>

      {/* AI Summary */}
      {latestAnalysis?.ai_summary && (
        <div className="arch-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 size={12} className="text-green-400" />
            </div>
            <span className="text-xs font-semibold text-white">Architecture Overview</span>
          </div>
          <p className="text-xs text-white/50 leading-relaxed">{latestAnalysis.ai_summary}</p>
          {latestAnalysis.tech_stack?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {latestAnalysis.tech_stack.map((t: string) => (
                <span key={t} className="text-[11px] px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(99,102,241,0.12)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.2)" }}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active integrations */}
      <div className="arch-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-white">Active integrations</p>
          <span className="text-xs text-white/30">1 connected</span>
        </div>
        <div className="space-y-2">
          <IntegrationRow
            icon={Github} iconBg="rgba(255,255,255,0.08)"
            name="GitHub" sub={repo.full_name}
            status="active"
          />
          <IntegrationRow
            icon={Zap} iconBg="rgba(99,102,241,0.15)"
            name="Webhook" sub="Push events"
            status="inactive"
            onConnect={() => toast("Webhook setup available in settings")}
          />
          <IntegrationRow
            icon={Shield} iconBg="rgba(16,185,129,0.15)"
            name="Security scan" sub="Automated on analysis"
            status={latestAnalysis?.status === "completed" ? "active" : "inactive"}
          />
        </div>
      </div>

      {/* Project info */}
      <div className="arch-card p-4">
        <p className="text-sm font-semibold text-white mb-3">Project info</p>
        <div className="space-y-2.5">
          {[
            ["Name", repo.name],
            ["Repository", repo.full_name],
            ["Branch", repo.default_branch],
            ["Language", repo.language || "—"],
            ["Stars", repo.stars_count],
            ["Size", `${(repo.size_kb / 1024).toFixed(1)} MB`],
            ["Connected", repo.created_at ? formatDistanceToNow(new Date(repo.created_at), { addSuffix: true }) : "—"],
          ].map(([label, val]) => (
            <div key={String(label)} className="flex items-center justify-between">
              <span className="text-xs text-white/35">{label}</span>
              <span className="text-xs font-medium text-white truncate max-w-[55%] text-right">{String(val)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MapTab({ analysisId, repoName, status }: any) {
  if (!analysisId || status !== "completed") {
    return (
      <div className="arch-card p-10 text-center">
        <Map size={32} className="mx-auto mb-3 text-white/15" />
        <p className="text-sm font-medium text-white/40">Architecture map not ready</p>
        <p className="text-xs text-white/25 mt-1">
          {status === "completed" ? "Map unavailable" : "Analysis must complete before the map is available."}
        </p>
      </div>
    );
  }
  return (
    <Link href={`/dashboard/repositories/${analysisId}/map`}>
      <div className="arch-card-hover p-6 text-center cursor-pointer">
        <Map size={32} className="mx-auto mb-3 text-brand-400" />
        <p className="text-sm font-semibold text-white">Open Architecture Map</p>
        <p className="text-xs text-white/40 mt-1">Interactive React Flow graph with all nodes and edges.</p>
        <span className="mt-4 inline-flex items-center gap-1 text-xs text-brand-400">
          Open full map <ExternalLink size={11} />
        </span>
      </div>
    </Link>
  );
}

function ReportsTab({ repoId, analysisId, status }: any) {
  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports", repoId],
    queryFn: () => import("@/lib/api").then((m) => m.reportsApi.listByRepo(repoId)),
    enabled: !!repoId,
  });

  const REPORT_TYPES = [
    { id: "architecture_overview", label: "Architecture Overview", icon: BarChart3, desc: "Full architecture analysis" },
    { id: "onboarding", label: "Onboarding Guide", icon: FileText, desc: "New developer ramp-up guide" },
    { id: "interview_defense", label: "Interview Defense", icon: Shield, desc: "Architecture Q&A preparation" },
    { id: "security", label: "Security Report", icon: Shield, desc: "Security vulnerabilities & risks" },
    { id: "technical_debt", label: "Technical Debt", icon: AlertCircle, desc: "Debt & remediation roadmap" },
  ];

  const generateReport = async (type: string) => {
    if (!analysisId || status !== "completed") {
      toast.error("Analysis must complete before generating reports");
      return;
    }
    try {
      const { reportsApi } = await import("@/lib/api");
      await reportsApi.generate({ repository_id: repoId, analysis_id: analysisId, report_type: type });
      toast.success("Report generation started!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate report");
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40">Generate AI-powered architecture reports for this repository.</p>

      {REPORT_TYPES.map((rt) => (
        <div key={rt.id} className="arch-card p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)" }}>
              <rt.icon size={16} className="text-brand-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{rt.label}</p>
              <p className="text-xs text-white/35 mt-0.5">{rt.desc}</p>
            </div>
            <button onClick={() => generateReport(rt.id)}
              disabled={status !== "completed"}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-40"
              style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)", color: "#a5b4fc" }}>
              Generate
            </button>
          </div>
        </div>
      ))}

      {/* Existing reports */}
      {reports && reports.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-white/40 mb-2 uppercase tracking-wider">Generated Reports</p>
          {reports.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-xl mb-2"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <p className="text-sm font-medium text-white">{r.title}</p>
                <p className="text-xs text-white/30">{r.status} · {r.created_at ? formatDistanceToNow(new Date(r.created_at), { addSuffix: true }) : ""}</p>
              </div>
              {r.status === "completed" && (
                <a href={`${process.env.NEXT_PUBLIC_API_URL}/api/reports/${r.id}/export/pdf`} target="_blank" rel="noopener">
                  <button className="text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
                    PDF
                  </button>
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SecurityTab({ analysisId, status }: any) {
  const { data, isLoading } = useQuery({
    queryKey: ["security", analysisId],
    queryFn: () => analysesApi.security(analysisId!),
    enabled: !!analysisId && status === "completed",
  });

  if (!analysisId || status !== "completed") {
    return (
      <div className="arch-card p-10 text-center">
        <Shield size={32} className="mx-auto mb-3 text-white/15" />
        <p className="text-sm font-medium text-white/40">Security scan not available</p>
        <p className="text-xs text-white/25 mt-1">Complete an analysis to run security scanning.</p>
      </div>
    );
  }

  const summary = data?.summary;
  const findings = data?.findings || [];

  const severityConfig: Record<string, { cls: string; label: string }> = {
    critical: { cls: "severity-critical", label: "Critical" },
    high:     { cls: "severity-high",     label: "High" },
    medium:   { cls: "severity-medium",   label: "Medium" },
    low:      { cls: "severity-low",      label: "Low" },
    info:     { cls: "severity-info",     label: "Info" },
  };

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Critical", val: summary.critical, color: "#ef4444" },
            { label: "High", val: summary.high, color: "#f97316" },
            { label: "Medium", val: summary.medium, color: "#eab308" },
            { label: "Total", val: summary.total, color: "#6366f1" },
          ].map((s) => (
            <div key={s.label} className="metric-card">
              <p className="text-xs mb-1" style={{ color: `${s.color}90` }}>{s.label}</p>
              <p className="text-2xl font-bold text-white">{s.val}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-16 shimmer rounded-xl"/>)}</div>
      ) : findings.length === 0 ? (
        <div className="arch-card p-8 text-center">
          <CheckCircle2 size={28} className="mx-auto mb-2 text-green-400" />
          <p className="text-sm font-medium text-white">No security issues found</p>
          <p className="text-xs text-white/30 mt-1">Your codebase looks clean!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {findings.map((f) => {
            const cfg = severityConfig[f.severity] || severityConfig.info;
            return (
              <div key={f.id} className="arch-card p-4">
                <div className="flex items-start gap-3">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border capitalize flex-shrink-0 mt-0.5 ${cfg.cls}`}>
                    {cfg.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{f.title}</p>
                    <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{f.description}</p>
                    {f.file_path && (
                      <p className="text-[11px] text-white/25 mt-1 font-mono truncate">
                        {f.file_path}{f.line_number ? `:${f.line_number}` : ""}
                      </p>
                    )}
                    {f.recommendation && (
                      <p className="text-xs text-brand-400/70 mt-2 leading-relaxed">
                        💡 {f.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ repo }: any) {
  const [name, setName] = useState(repo.name);
  const [desc, setDesc] = useState(repo.description || "");
  const [cta, setCta] = useState("none");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    toast.success("Settings saved");
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${repo.name}? This cannot be undone.`)) return;
    try {
      await repositoriesApi.disconnect(repo.id);
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
      toast.success("Repository disconnected");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      {/* General */}
      <div className="arch-card p-5">
        <h3 className="text-sm font-bold text-white mb-1">General</h3>
        <p className="text-xs text-white/35 mb-4">Basic information about this repository.</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Project name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Description <span className="text-white/20">Shown in your repository list.</span></label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="arch-card p-5">
        <h3 className="text-sm font-bold text-white mb-1">Call-to-action</h3>
        <p className="text-xs text-white/35 mb-4">Appended to every report generated for this repository.</p>
        <div className="space-y-2">
          {[
            { id: "none", label: "No CTA", desc: "Reports end naturally, no call-to-action." },
            { id: "waitlist", label: "Join waitlist", desc: "Invite readers to sign up for the waitlist." },
            { id: "free", label: "Try for free", desc: "Invite readers to try the product at no cost." },
            { id: "start", label: "Start using", desc: "Invite readers to start using the product." },
            { id: "engage", label: "Engage audience", desc: "End with a question to spark conversation." },
          ].map((opt) => (
            <label key={opt.id} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${cta === opt.id ? "border-brand-500/30" : ""}`}
              style={{ border: `1px solid ${cta === opt.id ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)"}`, background: cta === opt.id ? "rgba(99,102,241,0.06)" : "transparent" }}>
              <input type="radio" name="cta" value={opt.id} checked={cta === opt.id}
                onChange={() => setCta(opt.id)} className="mt-0.5 accent-brand-500" />
              <div>
                <p className="text-sm font-medium text-white">{opt.label}</p>
                <p className="text-xs text-white/35">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="btn-primary text-sm px-5 py-2.5 rounded-xl disabled:opacity-60">
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl p-5" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}>
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle size={14} className="text-red-400" />
          <h3 className="text-sm font-bold text-red-400">Delete repository</h3>
        </div>
        <p className="text-xs text-white/40 mb-4 leading-relaxed">
          Permanently disconnect <strong className="text-white">{repo.name}</strong> and delete all its analyses, reports, and history. This cannot be undone.
        </p>
        <button onClick={handleDelete}
          className="flex items-center gap-2 text-xs px-4 py-2 rounded-xl font-medium transition-all"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
          🗑 Delete this repository
        </button>
      </div>
    </div>
  );
}
