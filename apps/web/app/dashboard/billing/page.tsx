"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Crown, GitBranch, FileText, Zap, Check, ExternalLink, Star } from "lucide-react";
import { workspacesApi, paymentsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { format } from "date-fns";
import toast from "react-hot-toast";

function UsageMeter({ label, icon: Icon, used, limit, color = "#6366f1" }: any) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const formatted = limit >= 9999 ? "∞" : limit.toLocaleString();
  return (
    <div className="arch-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-white/30" />
          <span className="text-xs text-white/50">{label}</span>
        </div>
        <span className="text-xs text-white/30">{pct.toFixed(0)}%</span>
      </div>
      <div className="flex items-end gap-1 mb-2">
        <span className="text-2xl font-bold text-white">{used.toLocaleString()}</span>
        <span className="text-sm text-white/30 mb-0.5">/{formatted}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function PlanCard({ plan, currentPlan, onUpgrade }: { plan: any; currentPlan: string; onUpgrade: (id: string) => void }) {
  const isCurrent = currentPlan === plan.id;
  const isPopular = plan.popular;

  return (
    <div className="relative">
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold"
            style={{ background: "rgba(10,10,10,0.95)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}>
            <Star size={10} /> MOST POPULAR
          </span>
        </div>
      )}
      <div className={`arch-card p-5 ${isPopular ? "border-brand-500/25" : ""}`}
        style={isPopular ? { borderColor: "rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.03)" } : {}}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Crown size={16} className="text-white/50" />
          </div>
          <div>
            <p className="text-base font-bold text-white">{plan.name}</p>
            <p className="text-xs text-white/35">{plan.desc}</p>
          </div>
        </div>

        <div className="flex items-end gap-1 mb-4">
          <span className="text-3xl font-bold text-white">${plan.price_usd}</span>
          <span className="text-sm text-white/35 mb-0.5">/month</span>
        </div>

        <button
          onClick={() => !isCurrent && onUpgrade(plan.id)}
          disabled={isCurrent}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-all mb-4 ${
            isCurrent
              ? "bg-white/04 border border-white/08 text-white/30 cursor-default"
              : isPopular
                ? "bg-white text-black hover:bg-white/92"
                : "bg-white/06 border border-white/10 text-white hover:bg-white/10"
          }`}
        >
          {isCurrent ? "Current plan" : "Upgrade"}
        </button>

        <div className="space-y-2 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {plan.features.map((f: string) => (
            <div key={f} className="flex items-center gap-2">
              <Check size={13} className="text-white/30 flex-shrink-0" />
              <span className="text-xs text-white/55">{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { isAuthenticated } = useAuthStore();

  const { data: workspaces } = useQuery({
    queryKey: ["workspaces"],
    queryFn: workspacesApi.list,
    enabled: isAuthenticated,
  });

  const workspace = workspaces?.[0];

  const { data: billing, isLoading } = useQuery({
    queryKey: ["billing", workspace?.id],
    queryFn: () => paymentsApi.getBilling(workspace!.id),
    enabled: !!workspace?.id,
  });

  const paymentMutation = useMutation({
    mutationFn: (planId: string) =>
      paymentsApi.createPayment({ workspace_id: workspace!.id, plan: planId }),
    onSuccess: (data) => {
      if (data.payment_url) {
        window.open(data.payment_url, "_blank");
      }
      toast.success("Payment page opened!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to initiate payment"),
  });

  const sub = billing?.subscription;
  const plans = billing?.available_plans || [];
  const planHistory = billing?.payments || [];

  const PLAN_FEATURES: Record<string, string[]> = {
    starter: ["3 repositories", "30 analyses/month", "30 reports/month", "All report types", "GitHub integration", "Security scanning", "PDF & Markdown export"],
    pro:     ["20 repositories", "200 analyses/month", "100 reports/month", "Team workspaces (5 members)", "Priority AI processing", "PPTX export", "Drift detection", "Priority support"],
    enterprise: ["Unlimited repositories", "Unlimited analyses", "Unlimited reports", "Unlimited team members", "RBAC permissions", "Custom AI prompts", "SLA support", "Dedicated onboarding"],
  };

  const PLAN_DESCS: Record<string, string> = {
    starter: "Perfect for solo engineers and small projects.",
    pro: "For growing teams who need real architecture intelligence.",
    enterprise: "For large engineering teams with no limits.",
  };

  return (
    <div className="p-4 pb-12 space-y-5">
      <div>
        <h1 className="text-lg font-bold text-white">Billing</h1>
        <p className="text-sm text-white/35">Manage your plan and track your usage.</p>
      </div>

      {/* Active plan card */}
      {sub && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="arch-card p-5" style={{ borderColor: "rgba(16,185,129,0.15)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Crown size={18} className="text-yellow-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-white capitalize">{sub.plan} Plan</p>
                <span className="status-active">Active</span>
              </div>
              <p className="text-xs text-white/35">
                {sub.plan === "free" ? "Free tier" : `$${sub.plan === "starter" ? 19 : sub.plan === "pro" ? 49 : 149}/mo`}
                {sub.current_period_end && ` · Renews ${format(new Date(sub.current_period_end), "MMMM d, yyyy")}`}
              </p>
            </div>
          </div>
          <button className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-white/50 transition-all"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <ExternalLink size={13} /> Manage subscription
          </button>
        </motion.div>
      )}

      {/* Usage meters */}
      {sub && (
        <div>
          <h2 className="text-sm font-semibold text-white/60 mb-3">Usage this month</h2>
          <div className="space-y-3">
            <UsageMeter
              label="Repositories"
              icon={GitBranch}
              used={1}
              limit={sub.repositories_limit}
              color="#6366f1"
            />
            <UsageMeter
              label="Analyses run"
              icon={Zap}
              used={0}
              limit={sub.analyses_per_month}
              color="#06b6d4"
            />
            <UsageMeter
              label="Reports generated"
              icon={FileText}
              used={0}
              limit={sub.reports_per_month}
              color="#8b5cf6"
            />
          </div>
        </div>
      )}

      {/* Plans */}
      <div>
        <h2 className="text-sm font-semibold text-white/60 mb-4">Plans</h2>
        <div className="space-y-5">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={{
                ...plan,
                desc: PLAN_DESCS[plan.id] || "",
                features: PLAN_FEATURES[plan.id] || [],
              }}
              currentPlan={sub?.plan || "free"}
              onUpgrade={(id) => paymentMutation.mutate(id)}
            />
          ))}
        </div>
      </div>

      {/* Payment history */}
      {planHistory.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-white/60 mb-3">Payment history</h2>
          <div className="arch-card p-4 space-y-3">
            {planHistory.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white capitalize">{p.plan} Plan</p>
                  <p className="text-xs text-white/30">{p.created_at ? format(new Date(p.created_at), "MMM d, yyyy") : ""}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">${p.amount_usd}</p>
                  <p className="text-xs text-white/30 capitalize">{p.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Crypto payment note */}
      <div className="p-4 rounded-xl text-xs text-white/30 leading-relaxed"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
        💳 Payments processed securely via NOWPayments. We accept USDT, BTC, ETH, and 50+ cryptocurrencies.
        All plans are monthly with no long-term commitment.
      </div>
    </div>
  );
}
