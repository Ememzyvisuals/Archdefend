"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, GitBranch, Bell, CreditCard,
  Settings, Menu, X, LogOut, Crown, Shield
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useAuthStore } from "@/store/auth";
import { authApi, workspacesApi, notificationsApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Image from "next/image";

const NAV_ITEMS = [
  { href: "/dashboard",              label: "Dashboard",   icon: LayoutDashboard, exact: true },
  { href: "/dashboard/repositories", label: "Repositories",icon: GitBranch },
  { href: "/dashboard/security",     label: "Security",    icon: Shield },
  { href: "/dashboard/billing",      label: "Billing",     icon: CreditCard },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, clearAuth, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const { data: workspaces } = useQuery({
    queryKey: ["workspaces"],
    queryFn: workspacesApi.list,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => notificationsApi.list(true),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const unreadCount = notifications?.length || 0;
  const plan = workspaces?.[0]?.plan || "free";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/?auth=1");
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = async () => {
    try { await authApi.logout(); } finally {
      clearAuth();
      router.push("/");
      toast.success("Logged out");
    }
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Logo size={40} showText={false} />
          <div className="flex gap-1">
            {[0,1,2].map((i) => (
              <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-500"
                animate={{ y: [-4,0,-4] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 z-40 w-64 flex flex-col"
            style={{ background: "#0f0f0f", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex flex-col h-full p-4">
              <div className="flex items-center justify-between mb-8">
                <Logo size={26} />
                <button onClick={() => setSidebarOpen(false)}
                  className="p-1.5 text-white/30 hover:text-white/70 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <nav className="flex-1 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(item.href, item.exact);
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}>
                      <div className={`nav-item ${active ? "active" : ""}`}>
                        <item.icon size={16} className={active ? "text-brand-400" : "text-white/40"} />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
                <div className="pt-2">
                  <Link href="/dashboard/notifications" onClick={() => setSidebarOpen(false)}>
                    <div className={`nav-item ${isActive("/dashboard/notifications") ? "active" : ""}`}>
                      <Bell size={16} className="text-white/40" />
                      <span>Notifications</span>
                      {unreadCount > 0 && (
                        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/20">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </Link>
                  <Link href="/dashboard/settings" onClick={() => setSidebarOpen(false)}>
                    <div className={`nav-item ${isActive("/dashboard/settings") ? "active" : ""}`}>
                      <Settings size={16} className="text-white/40" />
                      <span>Settings</span>
                    </div>
                  </Link>
                </div>
              </nav>

              <div className="mt-4 p-3 rounded-xl mb-3"
                style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <Crown size={13} className="text-yellow-400" />
                  <span className="text-xs font-semibold text-white capitalize">{plan}</span>
                </div>
                <p className="text-[11px] text-white/35">
                  {plan === "free" ? "Upgrade for more repos" : "Active subscription"}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-3"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                {user?.avatar_url ? (
                  <Image src={user.avatar_url} alt={user.name || "User"} width={32} height={32}
                    className="rounded-full border border-white/10 flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{user?.name}</p>
                  <p className="text-[11px] text-white/35 truncate">{user?.email}</p>
                </div>
                <button onClick={handleLogout} className="p-1.5 text-white/25 hover:text-white/60 transition-colors">
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3"
          style={{ background: "rgba(10,10,10,0.9)", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/06 transition-all">
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <Logo size={26} />
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/notifications">
              <button className="relative p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/06 transition-all">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500" />
                )}
              </button>
            </Link>
            {user?.avatar_url ? (
              <Image src={user.avatar_url} alt={user.name || "User"} width={28} height={28}
                className="rounded-full border border-white/10" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold">
                {user?.name?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
