import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { Icon } from "@/components/Icon";
import { useWorkout, formatDuration } from "@/store/workout";
import { useAuth } from "@/store/auth";
import { workoutDurationSec, workoutVolume } from "@/lib/analytics";
import { formatWeight } from "@/lib/units";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — IronLog" },
      {
        name: "description",
        content: "Browse past workouts and personal records.",
      },
    ],
  }),
  component: History,
});

function History() {
  const nav = useNavigate();
  const { user, hydrated } = useAuth();
  const { history, exercises, units, loadAll, loading } = useWorkout();
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      nav({ to: "/login" });
      return;
    }
    void loadAll();
  }, [hydrated, user, loadAll, nav]);

  const exMap = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises],
  );

  const filtered = useMemo(
    () =>
      history.filter(
        (h) => q === "" || h.name.toLowerCase().includes(q.toLowerCase()),
      ),
    [history, q],
  );

  return (
    <MobileShell>
      <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border bg-background/80 px-6 pb-3 pt-10 backdrop-blur-md">
        <h1 className="text-xl font-bold tracking-tight">History</h1>
        <div className="relative">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search workouts…"
            className="h-9 w-full rounded-full border border-border bg-secondary/50 pl-9 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
      </header>

      <main className="relative flex-1 px-4 pb-24 pt-4">
        {loading && history.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        )}
        {!loading && filtered.length === 0 && (
          <div className="mt-10 flex flex-col items-center gap-3 px-6 text-center">
            <Icon
              name="history"
              className="text-[32px] text-muted-foreground"
            />
            <p className="text-base font-semibold">No workouts logged yet</p>
            <p className="text-sm text-muted-foreground">
              Past sessions will appear here as soon as you finish your first
              workout.
            </p>
          </div>
        )}

        {filtered.length > 0 && (
          <>
            <div className="absolute bottom-24 left-7 top-20 w-px bg-border" />
            <div className="flex flex-col gap-4">
              {filtered.map((h, i) => {
                const vol = workoutVolume(h);
                const dur = workoutDurationSec(h);
                const exNames = [
                  ...new Set(
                    h.sets
                      .map((s) => exMap.get(s.exercise_id)?.name)
                      .filter(Boolean),
                  ),
                ] as string[];
                return (
                  <div key={h.id} className="relative pl-6">
                    <span
                      className={cn(
                        "absolute left-[-2px] top-6 h-3 w-3 rounded-full border",
                        open === h.id
                          ? "border-primary bg-primary glow-soft"
                          : i === 0
                            ? "border-primary/40 bg-primary"
                            : "border-border bg-muted",
                      )}
                    />
                    <button
                      className={cn(
                        "glass-panel w-full overflow-hidden rounded-lg text-left transition-colors",
                        open === h.id && "border-primary/60",
                      )}
                      onClick={() => setOpen(open === h.id ? null : h.id)}
                    >
                      <div className="flex items-start justify-between p-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                            {new Date(h.started_at).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "2-digit",
                                year: "numeric",
                              },
                            )}
                          </p>
                          <p className="mt-1 text-lg font-bold">{h.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {exNames.slice(0, 3).join(", ") || "No exercises"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs tabular-nums text-muted-foreground">
                            {formatDuration(dur)}
                          </p>
                          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                            Vol
                          </p>
                          <p className="text-base font-bold tabular-nums">
                            {formatWeight(vol, units)}
                          </p>
                        </div>
                      </div>

                      {open === h.id && (
                        <div className="border-t border-border bg-black/20 p-4">
                          {exNames.map((name) => {
                            const sets = h.sets.filter(
                              (s) => exMap.get(s.exercise_id)?.name === name,
                            );
                            return (
                              <div key={name} className="mb-4 last:mb-0">
                                <div className="mb-2 flex items-center gap-2">
                                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                  <p className="text-sm font-semibold">{name}</p>
                                </div>
                                <div className="grid grid-cols-[40px_1fr_60px] border-b border-border pb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                                  <span>Set</span>
                                  <span className="text-center">Weight</span>
                                  <span className="text-right">Reps</span>
                                </div>
                                {sets.map((s, idx) => (
                                  <div
                                    key={s.id}
                                    className="grid grid-cols-[40px_1fr_60px] py-1.5 text-sm tabular-nums"
                                  >
                                    <span className="text-muted-foreground">
                                      {idx + 1}
                                    </span>
                                    <span className="text-center">
                                      {formatWeight(s.weight, units)}
                                    </span>
                                    <span
                                      className={cn(
                                        "text-right flex items-center justify-end gap-1",
                                        s.is_pr && "text-success",
                                      )}
                                    >
                                      {s.reps}
                                      {s.is_pr && (
                                        <Icon
                                          name="emoji_events"
                                          filled
                                          className="text-[14px]"
                                        />
                                      )}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </MobileShell>
  );
}
