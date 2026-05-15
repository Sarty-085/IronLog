import { create } from "zustand";
import { api, type ApiExercise, type ApiSet, type ApiWorkout } from "@/lib/api";
import { convertWeight, type Units } from "@/lib/units";

// Active workout is held in local state and synced to the API on each set
// mutation. History/exercises are loaded from the API.

type LocalSet = {
  id: string; // server id when synced; "local-..." while pending
  exercise_id: string;
  set_index: number;
  weight: number; // stored in user's CURRENT units
  reps: number;
  is_done: boolean;
  is_pr: boolean;
  prev?: { weight: number; reps: number; units: Units };
  _pendingSync?: boolean; // true while awaiting API response
};

type LocalExerciseGroup = {
  exercise: ApiExercise;
  sets: LocalSet[];
};

export type ActiveWorkout = {
  id: string;
  name: string;
  startedAt: number;
  groups: LocalExerciseGroup[];
};

type S = {
  units: Units;
  active: ActiveWorkout | null;
  history: ApiWorkout[];
  exercises: ApiExercise[];
  loading: boolean;
  error: string | null;

  setUnits: (u: Units) => void;
  loadAll: () => Promise<void>;
  startWorkout: (name?: string) => Promise<void>;
  endWorkout: () => Promise<string | null>;
  addExercise: (name: string, group: string) => Promise<void>;
  addSet: (exerciseId: string) => Promise<void>;
  removeSet: (exerciseId: string, setId: string) => Promise<void>;
  removeExercise: (exerciseId: string) => void;
  updateSet: (
    exerciseId: string,
    setId: string,
    patch: Partial<Pick<LocalSet, "weight" | "reps" | "is_done">>,
  ) => Promise<void>;
  toggleSetDone: (exerciseId: string, setId: string) => Promise<void>;
  bumpWeight: (exerciseId: string, setId: string, delta: number) => Promise<void>;
};

function findPrev(
  history: ApiWorkout[],
  exerciseId: string,
  units: Units,
): { weight: number; reps: number; units: Units } | undefined {
  for (const w of history) {
    const last = [...w.sets]
      .reverse()
      .find((s) => s.exercise_id === exerciseId && s.is_done);
    if (last) {
      return { weight: last.weight, reps: last.reps, units };
    }
  }
  return undefined;
}

/** Update a group's sets in the active workout immutably. */
function patchGroups(
  groups: LocalExerciseGroup[],
  exerciseId: string,
  setSets: (prev: LocalSet[]) => LocalSet[],
): LocalExerciseGroup[] {
  return groups.map((g) =>
    g.exercise.id !== exerciseId ? g : { ...g, sets: setSets(g.sets) },
  );
}

export const useWorkout = create<S>()((set, get) => ({
  units:
    (typeof window !== "undefined" &&
      (localStorage.getItem("ironlog.units") as Units)) ||
    "lbs",
  active: null,
  history: [],
  exercises: [],
  loading: false,
  error: null,

  setUnits: (u) => {
    if (typeof window !== "undefined") localStorage.setItem("ironlog.units", u);
    set({ units: u });
  },

  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const [history, exercises] = await Promise.all([
        api.listWorkouts(),
        api.listExercises(),
      ]);
      const sorted = [...history].sort(
        (a, b) =>
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
      );
      set({ history: sorted, exercises, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load",
      });
    }
  },

  startWorkout: async (name = "New Workout") => {
    const w = await api.createWorkout({ name });
    set({
      active: {
        id: w.id,
        name: w.name,
        startedAt: new Date(w.started_at).getTime(),
        groups: [],
      },
    });
  },

  endWorkout: async () => {
    const a = get().active;
    if (!a) return null;
    const finished = await api.patchWorkout(a.id, {
      ended_at: new Date().toISOString(),
    });
    set({ active: null });
    await get().loadAll();
    return finished.id;
  },

  addExercise: async (name, group) => {
    const a = get().active;
    if (!a) return;
    // Reuse existing exercise by exact name (case-insensitive); otherwise create.
    let ex = get().exercises.find(
      (e) => e.name.toLowerCase() === name.toLowerCase(),
    );
    if (!ex) {
      ex = await api.createExercise({ name, muscle_group: group });
      set({ exercises: [...get().exercises, ex] });
    }
    // Don't add if already in this workout
    if (a.groups.find((g) => g.exercise.id === ex!.id)) return;
    set({
      active: {
        ...a,
        groups: [...a.groups, { exercise: ex, sets: [] }],
      },
    });
    // Seed first set so UX matches the design.
    await get().addSet(ex.id);
  },

  addSet: async (exerciseId) => {
    const a = get().active;
    if (!a) return;
    const grp = a.groups.find((g) => g.exercise.id === exerciseId);
    if (!grp) return;
    const last = grp.sets[grp.sets.length - 1];
    const prev = findPrev(get().history, exerciseId, get().units);
    const seed = {
      weight: last?.weight ?? prev?.weight ?? 0,
      reps: last?.reps ?? 0,
    };

    // Optimistic local ID while waiting for server
    const tempId = `local-${Date.now()}-${Math.random()}`;
    const optimistic: LocalSet = {
      id: tempId,
      exercise_id: exerciseId,
      set_index: grp.sets.length + 1,
      weight: seed.weight,
      reps: seed.reps,
      is_done: false,
      is_pr: false,
      prev,
      _pendingSync: true,
    };

    set({
      active: {
        ...get().active!,
        groups: patchGroups(
          get().active!.groups,
          exerciseId,
          (sets) => [...sets, optimistic],
        ),
      },
    });

    try {
      const created = await api.addSet(a.id, {
        exercise_id: exerciseId,
        weight: seed.weight,
        reps: seed.reps,
        is_done: false,
      });
      // Replace the optimistic entry with the real server ID
      set({
        active: get().active
          ? {
              ...get().active!,
              groups: patchGroups(
                get().active!.groups,
                exerciseId,
                (sets) =>
                  sets.map((s) =>
                    s.id === tempId
                      ? {
                          ...s,
                          id: created.id,
                          set_index: created.set_index,
                          _pendingSync: false,
                        }
                      : s,
                  ),
              ),
            }
          : null,
      });
    } catch {
      // Remove the optimistic set on failure so state stays clean
      set({
        active: get().active
          ? {
              ...get().active!,
              groups: patchGroups(
                get().active!.groups,
                exerciseId,
                (sets) => sets.filter((s) => s.id !== tempId),
              ),
            }
          : null,
      });
    }
  },

  removeSet: async (exerciseId, setId) => {
    const a = get().active;
    if (!a) return;
    // Remove optimistically
    set({
      active: {
        ...a,
        groups: patchGroups(a.groups, exerciseId, (sets) =>
          sets.filter((s) => s.id !== setId),
        ),
      },
    });
    // Fire delete only for server-synced sets
    if (!setId.startsWith("local-")) {
      try {
        await api.deleteSet(setId);
      } catch {
        /* best-effort delete */
      }
    }
  },

  removeExercise: (exerciseId) => {
    const a = get().active;
    if (!a) return;
    set({
      active: {
        ...a,
        groups: a.groups.filter((g) => g.exercise.id !== exerciseId),
      },
    });
  },

  updateSet: async (exerciseId, setId, patch) => {
    const a = get().active;
    if (!a) return;
    // Optimistic UI
    set({
      active: {
        ...a,
        groups: patchGroups(a.groups, exerciseId, (sets) =>
          sets.map((s) => (s.id !== setId ? s : { ...s, ...patch })),
        ),
      },
    });
    // Skip server sync for unsynced sets
    if (setId.startsWith("local-")) return;
    const cur = get()
      .active?.groups.find((g) => g.exercise.id === exerciseId)
      ?.sets.find((s) => s.id === setId);
    if (!cur) return;
    try {
      const updated = await api.patchSet(setId, {
        exercise_id: exerciseId,
        weight: cur.weight,
        reps: cur.reps,
        is_done: cur.is_done,
      });
      // Sync is_pr flag returned from server
      set({
        active: get().active
          ? {
              ...get().active!,
              groups: patchGroups(
                get().active!.groups,
                exerciseId,
                (sets) =>
                  sets.map((s) =>
                    s.id === setId ? { ...s, is_pr: updated.is_pr } : s,
                  ),
              ),
            }
          : null,
      });
    } catch {
      /* offline-tolerant */
    }
  },

  toggleSetDone: async (exerciseId, setId) => {
    const cur = get()
      .active?.groups.find((g) => g.exercise.id === exerciseId)
      ?.sets.find((s) => s.id === setId);
    if (!cur) return;
    // Vibrate on completion (native PWA feel)
    if (!cur.is_done && typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(30);
    }
    await get().updateSet(exerciseId, setId, { is_done: !cur.is_done });
  },

  bumpWeight: async (exerciseId, setId, delta) => {
    const cur = get()
      .active?.groups.find((g) => g.exercise.id === exerciseId)
      ?.sets.find((s) => s.id === setId);
    if (!cur) return;
    await get().updateSet(exerciseId, setId, {
      weight: Math.max(0, cur.weight + delta),
    });
  },
}));

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function setBumpUnits(units: Units): number {
  // Default plate increments: 5/2.5 lbs or 2.5/1.25 kg
  return units === "kg" ? 2.5 : 5;
}

export { convertWeight };
