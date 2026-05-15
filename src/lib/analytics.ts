// Pure analytics functions used client-side for local display calculations
// (e.g. workout cards in history). Aggregate analytics are now served
// exclusively from the backend /analytics/* endpoints.
import type { ApiSet, ApiWorkout } from "./api";

export type EnrichedSet = ApiSet & {
  exercise: { id: string; name: string; muscle_group: string } | undefined;
};

/** Epley 1RM estimate. Returns weight units same as input. */
export function epley1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function setVolume(s: Pick<ApiSet, "weight" | "reps">) {
  return s.weight * s.reps;
}

/** Total volume of all completed sets in a single workout (for display in cards). */
export function workoutVolume(w: ApiWorkout) {
  return w.sets.filter((s) => s.is_done).reduce((sum, s) => sum + setVolume(s), 0);
}

/** Duration of a workout in seconds. */
export function workoutDurationSec(w: ApiWorkout): number {
  const start = new Date(w.started_at).getTime();
  const end = w.ended_at ? new Date(w.ended_at).getTime() : Date.now();
  return Math.max(0, Math.round((end - start) / 1000));
}
