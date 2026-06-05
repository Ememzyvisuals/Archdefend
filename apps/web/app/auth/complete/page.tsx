"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/auth";
import { Logo } from "@/components/ui/logo";

export default function AuthCompletePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get("token");
    const refresh = searchParams.get("refresh");
    const userStr = searchParams.get("user");

    if (!token || !refresh || !userStr) {
      router.replace("/?auth_error=missing_params");
      return;
    }

    try {
      const user = JSON.parse(decodeURIComponent(userStr));
      setAuth(user, token, refresh);

      // Small delay for store to persist
      setTimeout(() => {
        router.replace("/dashboard");
      }, 300);
    } catch {
      router.replace("/?auth_error=parse_error");
    }
  }, [searchParams, setAuth, router]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6"
      >
        <Logo size={48} showText={false} />

        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-brand-500"
                animate={{ y: [-6, 0, -6], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
              />
            ))}
          </div>
          <p className="text-sm text-white/40">Signing you in...</p>
        </div>
      </motion.div>
    </div>
  );
}
