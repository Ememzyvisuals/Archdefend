"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Github, User, Bell, Shield, Trash2 } from "lucide-react";
import { authApi, workspacesApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const router = useRouter();
  const [notifSettings, setNotifSettings] = useState({
    analysis_complete: true,
    security_findings: true,
    drift_alerts: true,
    workspace_invites: true,
  });

  const { data: workspaces } = useQuery({
    queryKey: ["workspaces"],
    queryFn: workspacesApi.list,
    enabled: isAuthenticated,
  });
  const workspace = workspaces?.[0];

  const handleConnectGithub = async () => {
    try {
      const { url } = await authApi.getGithubUrl();
      window.location.href = url;
    } catch {
      toast.error("Failed to get GitHub URL");
    }
  };

  const handleDeleteAccount = () => {
    toast.error("Account deletion: contact support@archdefend.app");
  };

  const handleLogout = async () => {
    try { await authApi.logout(); } finally {
      clearAuth();
      router.push("/");
    }
  };

  const toggleNotif = (key: string) => {
    setNotifSettings((p) => ({ ...p, [key]: !p[key as keyof typeof p] }));
  };

  return (
    <div className="p-4 pb-12 space-y-5">
      <div>
        <h1 className="text-lg font-bold text-white">Settings</h1>
        <p className="text-sm text-white/35">Manage your account preferences.</p>
      </div>

      {/* Profile */}
      <div className="arch-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <User size={15} className="text-white/40" />
          <h2 className="text-sm font-semibold text-white">Profile</h2>
        </div>
        <div className="flex items-center gap-3 mb-4">
          {user?.avatar_url ? (
            <Image src={user.avatar_url} alt={user.name || "User"} width={56} height={56}
              className="rounded-2xl border border-white/10" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center text-xl font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-white">{user?.name}</p>
            <p className="text-sm text-white/40">{user?.email}</p>
            {user?.github_username && (
              <p className="text-xs text-white/30">@{user.github_username}</p>
            )}
          </div>
        </div>
        <div className="space-y-2.5 text-xs">
          {[
            ["Joined", user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"],
            ["Last login", user?.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : "—"],
          ].map(([k, v]) => (
            <div key={String(k)} className="flex justify-between items-center py-1.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span className="text-white/35">{k}</span>
              <span className="text-white/60">{String(v)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Connected accounts */}
      <div className="arch-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Github size={15} className="text-white/40" />
          <h2 className="text-sm font-semibold text-white">Connected accounts</h2>
        </div>
        <div className="space-y-3">
          <div className="integration-row">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Github size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">GitHub</p>
                <p className="text-xs text-white/35">
                  {user?.github_username ? `@${user.github_username}` : "Not connected"}
                </p>
              </div>
            </div>
            {user?.has_github ? (
              <span className="status-active">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Connected
              </span>
            ) : (
              <button onClick={handleConnectGithub}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
                Connect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Workspace */}
      {workspace && (
        <div className="arch-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={15} className="text-white/40" />
            <h2 className="text-sm font-semibold text-white">Workspace</h2>
          </div>
          <div className="space-y-2.5 text-xs">
            {[
              ["Name",    workspace.name],
              ["Plan",    workspace.plan],
              ["Role",    workspace.role],
              ["Members", workspace.members_count],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex justify-between items-center py-1.5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span className="text-white/35 capitalize">{k}</span>
                <span className="text-white/60 capitalize">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="arch-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={15} className="text-white/40" />
          <h2 className="text-sm font-semibold text-white">Notifications</h2>
        </div>
        <div className="space-y-4">
          {[
            { key: "analysis_complete", label: "Analysis completed",  desc: "When a repository analysis finishes" },
            { key: "security_findings", label: "Security findings",   desc: "When new vulnerabilities are detected" },
            { key: "drift_alerts",      label: "Drift alerts",        desc: "When architecture changes are detected" },
            { key: "workspace_invites", label: "Workspace invites",   desc: "When someone invites you to a workspace" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs text-white/35">{item.desc}</p>
              </div>
              <div onClick={() => toggleNotif(item.key)}
                className="relative w-10 h-6 rounded-full transition-all cursor-pointer flex-shrink-0"
                style={{ background: notifSettings[item.key as keyof typeof notifSettings] ? "rgba(99,102,241,0.8)" : "rgba(255,255,255,0.1)" }}>
                <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200"
                  style={{ left: notifSettings[item.key as keyof typeof notifSettings] ? "calc(100% - 20px)" : "4px" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sign out */}
      <button onClick={handleLogout}
        className="w-full py-3 rounded-xl text-sm font-medium transition-all"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
        Sign out
      </button>

      {/* Danger zone */}
      <div className="rounded-2xl p-5"
        style={{ background: "rgba(239,68,68,0.03)", border: "1px solid rgba(239,68,68,0.1)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Trash2 size={14} className="text-red-400" />
          <h3 className="text-sm font-bold text-red-400">Danger zone</h3>
        </div>
        <p className="text-xs text-white/40 mb-4 leading-relaxed">
          Permanently delete your account and all associated data. Cannot be undone.
        </p>
        <button onClick={handleDeleteAccount}
          className="text-xs px-4 py-2 rounded-xl font-medium transition-all"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171" }}>
          Delete account
        </button>
      </div>

      <p className="text-center text-xs text-white/20">
        Need help?{" "}
        <a href="mailto:support@archdefend.app" className="text-brand-400 hover:text-brand-300 transition-colors">
          support@archdefend.app
        </a>
      </p>
    </div>
  );
}
