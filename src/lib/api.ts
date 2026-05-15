// Lightweight, typed REST client for the FastAPI backend (backend-starter/).
// Configure with VITE_API_BASE_URL. Auth header is read from localStorage.

const BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const TOKEN_KEY = "ironlog.jwt";

export const isApiConfigured = () => BASE.length > 0;

export const getToken = () =>
  typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);

export const setToken = (t: string | null) => {
  if (typeof window === "undefined") return;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Called by auth store on 401 so every part of the app auto-logs out.
let _onUnauthorized: (() => void) | null = null;
export function registerUnauthorizedHandler(cb: () => void) {
  _onUnauthorized = cb;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!BASE) {
    throw new ApiError(
      0,
      "Backend not configured. Set VITE_API_BASE_URL in .env to your FastAPI URL.",
    );
  }
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const t = getToken();
  if (t) headers.set("Authorization", `Bearer ${t}`);

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 204) return undefined as T;

  // Auto-logout on 401
  if (res.status === 401) {
    setToken(null);
    _onUnauthorized?.();
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg =
      (data && (data.detail || data.message)) || `HTTP ${res.status}`;
    throw new ApiError(
      res.status,
      typeof msg === "string" ? msg : "Request failed",
    );
  }
  return data as T;
}

// ---- Types matching backend-starter/app/schemas.py ----
export type ApiUser = {
  id: string;
  email: string;
  name: string;
  units: "lbs" | "kg";
};
export type ApiExercise = {
  id: string;
  name: string;
  muscle_group: string;
  is_global: boolean;
};
export type ApiSet = {
  id: string;
  exercise_id: string;
  set_index: number;
  weight: number;
  reps: number;
  rpe: number | null;
  is_done: boolean;
  is_pr: boolean;
};
export type ApiWorkout = {
  id: string;
  name: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  sets: ApiSet[];
};
export type ApiBodyMetric = {
  id: string;
  measured_at: string;
  weight: number | null;
  body_fat_pct: number | null;
  note: string | null;
};

// ---- Analytics types ----
export type ApiVolumeSeries = { date: string; volume: number }[];
export type ApiFrequencySeries = { date: string; count: number }[];
export type ApiMuscleVolume = { group: string; volume: number }[];
export type ApiPR = {
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  one_rm: number;
  best_weight: number;
  best_reps: number;
  achieved_at: string;
};
export type ApiSummary = {
  total_workouts: number;
  weekly_volume: number;
  monthly_volume: number;
  prev_weekly_volume: number;
  weekly_pct_change: number;
  current_streak: number;
};
export type ApiProgression = {
  date: string;
  max_weight: number;
  estimated_1rm: number;
}[];

export const api = {
  // auth
  signup: (body: { name: string; email: string; password: string }) =>
    request<{ access_token: string }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: () => request<ApiUser>("/auth/me"),
  updateMe: (body: { units?: string }) =>
    request<ApiUser>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  // exercises
  listExercises: () => request<ApiExercise[]>("/exercises"),
  createExercise: (body: { name: string; muscle_group: string }) =>
    request<ApiExercise>("/exercises", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // workouts
  listWorkouts: (limit = 100) =>
    request<ApiWorkout[]>(`/workouts?limit=${limit}`),
  getWorkout: (id: string) => request<ApiWorkout>(`/workouts/${id}`),
  createWorkout: (body: { name: string; notes?: string | null }) =>
    request<ApiWorkout>("/workouts", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchWorkout: (
    id: string,
    body: { name?: string; notes?: string | null; ended_at?: string },
  ) =>
    request<ApiWorkout>(`/workouts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteWorkout: (id: string) =>
    request<void>(`/workouts/${id}`, { method: "DELETE" }),

  // sets
  addSet: (
    workoutId: string,
    body: {
      exercise_id: string;
      weight: number;
      reps: number;
      rpe?: number | null;
      is_done?: boolean;
    },
  ) =>
    request<ApiSet>(`/workouts/${workoutId}/sets`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchSet: (
    setId: string,
    body: {
      exercise_id: string;
      weight: number;
      reps: number;
      rpe?: number | null;
      is_done?: boolean;
    },
  ) =>
    request<ApiSet>(`/sets/${setId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteSet: (setId: string) =>
    request<void>(`/sets/${setId}`, { method: "DELETE" }),

  // metrics
  listMetrics: () => request<ApiBodyMetric[]>("/metrics"),
  addMetric: (body: {
    weight?: number | null;
    body_fat_pct?: number | null;
    note?: string | null;
  }) =>
    request<ApiBodyMetric>("/metrics", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // analytics
  getVolumeSeries: (days = 30) =>
    request<ApiVolumeSeries>(`/analytics/volume?days=${days}`),
  getFrequency: (days = 70) =>
    request<ApiFrequencySeries>(`/analytics/frequency?days=${days}`),
  getStreak: () => request<{ streak: number }>("/analytics/streak"),
  getMuscleVolume: (days = 30) =>
    request<ApiMuscleVolume>(`/analytics/muscle-volume?days=${days}`),
  getPRs: () => request<ApiPR[]>("/analytics/prs"),
  getSummary: () => request<ApiSummary>("/analytics/summary"),
  getProgression: (exerciseId: string, days = 90) =>
    request<ApiProgression>(`/analytics/progression/${exerciseId}?days=${days}`),
};
