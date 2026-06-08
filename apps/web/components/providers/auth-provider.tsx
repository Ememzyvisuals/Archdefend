"use client";

import { createContext, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { authApi } from "@/lib/api";

export const AuthContext = createContext({});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, clearAuth, setLoading } = useAuthStore();

  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem("archdefend_token");
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const user = await authApi.me();
        setUser(user);
      } catch {
        const refreshToken = localStorage.getItem("archdefend_refresh");
        if (refreshToken) {
          try {
            const result = await authApi.refresh(refreshToken);
            localStorage.setItem("archdefend_token", result.access_token);
            localStorage.setItem("archdefend_refresh", result.refresh_token);
            const user = await authApi.me();
            setUser(user);
          } catch {
            clearAuth();
          }
        } else {
          clearAuth();
        }
      } finally {
        setLoading(false);
      }
    };
    verifySession();
  }, [setUser, clearAuth, setLoading]);

  return <AuthContext.Provider value={{}}>{children}</AuthContext.Provider>;
}
