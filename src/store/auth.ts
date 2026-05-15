import { create } from "zustand";
import {
  api,
  ApiError,
  getToken,
  isApiConfigured,
  registerUnauthorizedHandler,
  setToken,
  type ApiUser,
} from "@/lib/api";

type AuthState = {
  user: ApiUser | null;
  token: string | null;
  loading: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

function describeError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 0) return "Backend not configured. Set VITE_API_BASE_URL.";
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return "Request failed";
}

export const useAuth = create<AuthState>((set) => {
  const store = {
    user: null,
    token: typeof window !== "undefined" ? getToken() : null,
    loading: false,
    hydrated: false,

    hydrate: async () => {
      if (typeof window === "undefined") return;
      const t = getToken();
      if (!t || !isApiConfigured()) {
        set({ hydrated: true });
        return;
      }
      try {
        const user = await api.me();
        set({ user, token: t, hydrated: true });
      } catch {
        setToken(null);
        set({ user: null, token: null, hydrated: true });
      }
    },

    login: async (email: string, password: string) => {
      set({ loading: true });
      try {
        const { access_token } = await api.login({ email, password });
        setToken(access_token);
        const user = await api.me();
        set({ user, token: access_token });
      } catch (e) {
        throw new Error(describeError(e));
      } finally {
        set({ loading: false });
      }
    },

    signup: async (name: string, email: string, password: string) => {
      set({ loading: true });
      try {
        const { access_token } = await api.signup({ name, email, password });
        setToken(access_token);
        const user = await api.me();
        set({ user, token: access_token });
      } catch (e) {
        throw new Error(describeError(e));
      } finally {
        set({ loading: false });
      }
    },

    logout: () => {
      setToken(null);
      set({ user: null, token: null });
    },
  };

  // Register global 401 handler so any request auto-logs out
  registerUnauthorizedHandler(() => {
    setToken(null);
    set({ user: null, token: null });
  });

  return store;
});
