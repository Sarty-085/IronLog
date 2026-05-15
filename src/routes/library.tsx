import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MobileShell } from "@/components/MobileShell";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/store/auth";
import { useWorkout } from "@/store/workout";
import { api, type ApiPR } from "@/lib/api";
import { formatWeight } from "@/lib/units";
import { cn } from "@/lib/utils";

const MUSCLE_TABS = ["All", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio"] as const;

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Exercise Library — IronLog" },
      {
        name: "description",
        content: "Browse exercises with PR tracking.",
      },
    ],
  }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (!useAuth.getState().user) throw redirect({ to: "/login" });
  },
  component: Library,
});

function Library() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { exercises, units } = useWorkout();
  const [tab, setTab] = useState<(typeof MUSCLE_TABS)[number]>("All");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const enabled = !!user;

  const { data: prs = [] } = useQuery<ApiPR[]>({
    queryKey: ["analytics", "prs"],
    queryFn: () => api.getPRs(),
    enabled,
    staleTime: 60_000,
  });

  // Build a map from exercise_id → PR for O(1) lookup
  const prMap = useMemo(
    () => new Map(prs.map((p) => [p.exercise_id, p])),
    [prs],
  );

  // Use exercises from the global workout store (loaded from DB)
  const grouped = useMemo(() => {
    const filtered = exercises.filter(
      (e) =>
        (tab === "All" || e.muscle_group === tab) &&
        (q === "" || e.name.toLowerCase().includes(q.toLowerCase())),
    );
    const map = new Map<string, typeof exercises>();
    for (const ex of filtered) {
      const k = ex.name[0].toUpperCase();
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(ex);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [exercises, tab, q]);

  const selectedEx = selectedId
    ? exercises.find((e) => e.id === selectedId) ?? null
    : null;
  const selectedPR = selectedId ? prMap.get(selectedId) ?? null : null;

  return (
    <MobileShell>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/80 px-4 pb-3 pt-10 backdrop-blur-md">
        <button
          onClick={() => nav({ to: "/" })}
          className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/5"
          aria-label="Back"
        >
          <Icon name="arrow_back" />
        </button>
        <h1 className="flex-1 text-center text-base font-bold tracking-tight">
          Exercise Library
        </h1>
        <div className="w-9" />
      </header>

      <div className="flex flex-col gap-3 px-4 pt-4">
        <div className="relative">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search exercises…"
            className="h-10 w-full rounded-full border border-border bg-secondary/50 pl-10 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
          {MUSCLE_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-xs transition-colors",
                tab === t
                  ? "border-primary text-primary glow-soft"
                  : "border-border text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-3 pb-48">
        {exercises.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Loading exercises…
          </p>
        )}
        {grouped.length === 0 && exercises.length > 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No exercises match "{q}".
          </p>
        )}
        {grouped.map(([letter, items]) => (
          <div key={letter} className="mb-3">
            <p className="px-1 py-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {letter}
            </p>
            {items.map((ex) => {
              const pr = prMap.get(ex.id);
              return (
                <button
                  key={ex.id}
                  onClick={() =>
                    setSelectedId(selectedId === ex.id ? null : ex.id)
                  }
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg p-3 text-left transition-colors hover:bg-white/5",
                    selectedId === ex.id && "bg-white/5",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-secondary/40">
                      <Icon
                        name="fitness_center"
                        className="text-[18px] text-muted-foreground"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{ex.name}</p>
                      <span className="mt-0.5 inline-block rounded-md border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {ex.muscle_group}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pr && (
                      <Icon
                        name="emoji_events"
                        filled
                        className="text-[14px] text-primary"
                      />
                    )}
                    <Icon
                      name="chevron_right"
                      className="text-[16px] text-muted-foreground"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </main>

      {/* Detail panel — only shown when an exercise is selected */}
      {selectedEx && (
        <div className="fixed inset-x-0 bottom-[80px] z-20 mx-auto max-w-[480px] border-t border-border bg-background/95 px-4 pb-4 pt-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br from-primary/40 to-primary/10">
              <Icon name="fitness_center" className="text-[20px] text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold">{selectedEx.name}</p>
              <div className="mt-0.5 flex gap-1.5">
                <span className="rounded-md border border-border px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                  {selectedEx.muscle_group}
                </span>
                {selectedEx.is_global && (
                  <span className="rounded-md border border-primary/30 px-2 py-0.5 text-[10px] uppercase text-primary">
                    Global
                  </span>
                )}
              </div>
            </div>
          </div>

          {selectedPR ? (
            <>
              <p className="mb-2 mt-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Your Personal Records
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="glass-panel rounded-md p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    1RM Estimate
                  </p>
                  <p className="text-lg font-bold text-primary">
                    {formatWeight(selectedPR.one_rm, units)}
                  </p>
                </div>
                <div className="glass-panel rounded-md p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Best Set
                  </p>
                  <p className="text-lg font-bold">
                    {selectedPR.best_weight}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {units}
                    </span>{" "}
                    × {selectedPR.best_reps}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              No recorded sets yet. Log this exercise to track your progress.
            </p>
          )}
        </div>
      )}
    </MobileShell>
  );
}
