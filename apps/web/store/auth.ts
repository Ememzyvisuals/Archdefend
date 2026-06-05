import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/lib/api";

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string, refreshToken: string) => void;
  clearAuth: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: true,
      isAuthenticated: false,

      setAuth: (user, token, refreshToken) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("archdefend_token", token);
          localStorage.setItem("archdefend_refresh", refreshToken);
        }
        set({ user, token, refreshToken, isAuthenticated: true, isLoading: false });
      },

      clearAuth: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("archdefend_token");
          localStorage.removeItem("archdefend_refresh");
        }
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isLoading: false });
      },

      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: "archdefend-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
