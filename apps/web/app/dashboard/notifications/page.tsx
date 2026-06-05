"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Bell, CheckCheck, CheckCircle2, AlertCircle, BarChart3, Shield, GitBranch } from "lucide-react";
import { notificationsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  analysis_completed: { icon: CheckCircle2, color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  analysis_failed:    { icon: AlertCircle,  color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  security_finding:   { icon: Shield,       color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  drift_detected:     { icon: BarChart3,    color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  report_ready:       { icon: CheckCircle2, color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  workspace_invite:   { icon: GitBranch,    color: "#06b6d4", bg: "rgba(6,182,212,0.12)" },
};

export default function NotificationsPage() {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(false),
    enabled: isAuthenticated,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
  });

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  return (
    <div className="p-4 pb-12">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-white">Notifications</h1>
          <p className="text-sm text-white/35">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-medium transition-all"
            style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#a5b4fc" }}
          >
            <CheckCheck size={13} />
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-2xl shimmer" />
          ))}
        </div>
      ) : !notifications?.length ? (
        <div className="arch-card p-12 text-center">
          <Bell size={32} className="mx-auto mb-3 text-white/15" />
          <p className="text-sm font-medium text-white/40">No notifications yet</p>
          <p className="text-xs text-white/25 mt-1">
            Analysis completions, security findings, and drift alerts will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.analysis_completed;
            const Icon = cfg.icon;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => !n.is_read && markReadMutation.mutate(n.id)}
                className="arch-card p-4 cursor-pointer transition-all"
                style={{
                  borderColor: !n.is_read ? "rgba(99,102,241,0.15)" : undefined,
                  background: !n.is_read ? "rgba(99,102,241,0.03)" : undefined,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: cfg.bg }}
                  >
                    <Icon size={16} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-white leading-tight">{n.title}</p>
                      {!n.is_read && (
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                          style={{ background: cfg.color }}
                        />
                      )}
                    </div>
                    <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-[11px] text-white/20 mt-1.5">
                      {n.created_at
                        ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true })
                        : ""}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
