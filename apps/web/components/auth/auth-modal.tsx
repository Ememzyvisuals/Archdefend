"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Github, Chrome } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectTo?: string;
}

export function AuthModal({ isOpen, onClose, redirectTo = "/dashboard" }: AuthModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const handleGithub = async () => {
    setLoading("github");
    try {
      const { url, state } = await authApi.getGithubUrl();
      sessionStorage.setItem("oauth_state", state);
      sessionStorage.setItem("oauth_redirect", redirectTo);
      window.location.href = url;
    } catch {
      toast.error("Failed to connect with GitHub");
      setLoading(null);
    }
  };

  const handleGoogle = async () => {
    toast.error("Google sign-in coming soon. Use GitHub for full repository access.");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-sm arch-card p-8">
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-full text-white/30 hover:text-white/70 hover:bg-white/06 transition-colors"
              >
                <X size={16} />
              </button>

              {/* Header */}
              <div className="flex flex-col items-center gap-4 mb-8">
                <Logo size={40} showText={false} />
                <div className="text-center">
                  <div className="section-badge mb-3">WELCOME BACK</div>
                  <h2 className="text-xl font-bold text-white">Sign in to ArchDefend</h2>
                  <p className="text-sm text-white/40 mt-1.5">
                    Architecture intelligence for real engineering teams.
                  </p>
                </div>
              </div>

              {/* Auth buttons matching screenshots */}
              <div className="space-y-3">
                <button
                  onClick={handleGithub}
                  disabled={loading === "github"}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium text-white transition-all duration-150"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Github size={18} className="text-white" />
                    <span>Continue with GitHub</span>
                  </div>
                  {loading === "github" ? (
                    <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="text-white/30">→</span>
                  )}
                </button>

                <button
                  onClick={handleGoogle}
                  disabled={loading === "google"}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium text-white transition-all duration-150"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  }}
                >
                  <div className="flex items-center gap-3">
                    <GoogleIcon />
                    <span>Continue with Google</span>
                  </div>
                  <span className="text-white/30">→</span>
                </button>
              </div>

              {/* Terms */}
              <p className="text-center text-xs text-white/25 mt-6">
                By signing in, you agree to our{" "}
                <a href="/terms" className="underline hover:text-white/50 transition-colors">Terms</a>
                {" "}and{" "}
                <a href="/privacy" className="underline hover:text-white/50 transition-colors">Privacy Policy</a>.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
