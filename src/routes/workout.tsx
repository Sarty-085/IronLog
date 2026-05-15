import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MobileShell } from "@/components/MobileShell";
import { Icon } from "@/components/Icon";
import { useWorkout, formatDuration, setBumpUnits } from "@/store/workout";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workout")({
  head: () => ({
    meta: [
      { title: "Active Workout — IronLog" },
      {
        name: "description",
        content: "Log sets, reps, and weight in real time.",
      },
    ],
  }),
  component: ActiveWorkoutPage,
});

function ActiveWorkoutPage() {
  const nav = useNavigate();
  const { user, hydrated } = useAuth();
  const { active, startWorkout, endWorkout, units, loadAll } = useWorkout();
  const [picker, setPicker] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      nav({ to: "/login" });
    }
  }, [hydrated, user, nav]);

  if (!user) return null;

  if (!active) {
    return (
      <MobileShell showNav={false}>
        <WorkoutHeader title="Start Workout" elapsed={0} />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-24">
          <Icon
            name="fitness_center"
            className="text-[48px] text-muted-foreground"
          />
          <p className="text-base font-semibold">No active session</p>
          <p className="text-center text-sm text-muted-foreground">
            Begin a new workout to start logging sets.
          </p>
          <button
            onClick={() => void startWorkout("New Workout")}
            className="glow-primary mt-2 flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground active:scale-[0.98]"
          >
            <Icon name="play_arrow" filled className="text-[16px]" />
            Start Workout
          </button>
        </main>
      </MobileShell>
    );
  }

  async function handleFinish() {
    if (finishing) return;
    setFinishing(true);
    try {
      await endWorkout();
      // Invalidate analytics cache so dashboard/analytics refresh
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      nav({ to: "/history" });
    } finally {
      setFinishing(false);
    }
  }

  return (
    <MobileShell showNav={false}>
      <ActiveHeader />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-48 pt-2">
        {active.groups.length === 0 && (
          <div className="mt-8 flex flex-col items-center gap-2 px-6 text-center text-sm text-muted-foreground">
            <Icon name="add" className="text-[28px] text-muted-foreground" />
            <p>Tap "Add Exercise" to start logging.</p>
          </div>
        )}

        {active.groups.map((g, idx) => (
          <ExerciseCard
            key={g.exercise.id}
            exerciseId={g.exercise.id}
            highlighted={idx === 0}
          />
        ))}

        <button
          onClick={() => setPicker(true)}
          className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-4 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <Icon name="add" className="text-[18px]" />
          Add Exercise
        </button>
      </main>

      {picker && <ExercisePicker onClose={() => setPicker(false)} />}

      {/* Sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-border bg-background/95 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 backdrop-blur-md">
        <div className="flex gap-3">
          <button
            onClick={() => setPicker(true)}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition-transform active:scale-[0.98]"
          >
            <Icon name="add" className="text-[16px]" />
            Add Exercise
          </button>
          <button
            disabled={finishing}
            onClick={() => void handleFinish()}
            className="glow-primary flex h-12 flex-[1.2] items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-70"
          >
            {finishing ? (
              <span className="animate-pulse">Saving…</span>
            ) : (
              "Finish Workout"
            )}
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          Logging in {units}
        </p>
      </div>
    </MobileShell>
  );
}

function WorkoutHeader({
  title,
  elapsed,
}: {
  title: string;
  elapsed: number;
}) {
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-4 pb-3 pt-10 backdrop-blur-md">
      <button
        onClick={() => nav({ to: "/" })}
        className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/5"
        aria-label="Back"
      >
        <Icon name="arrow_back" className="text-[20px]" />
      </button>
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
        <p className="text-2xl font-bold tabular-nums tracking-wider">
          {formatDuration(elapsed)}
        </p>
      </div>
      <div className="w-9" />
    </header>
  );
}

function ActiveHeader() {
  const { active } = useWorkout();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = active ? Math.floor((now - active.startedAt) / 1000) : 0;
  return <WorkoutHeader title={active?.name ?? "Workout"} elapsed={elapsed} />;
}

function ExerciseCard({
  exerciseId,
  highlighted,
}: {
  exerciseId: string;
  highlighted?: boolean;
}) {
  const group = useWorkout((s) =>
    s.active?.groups.find((g) => g.exercise.id === exerciseId),
  );
  const removeExercise = useWorkout((s) => s.removeExercise);

  if (!group) return null;
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl p-5",
        highlighted ? "bg-transparent" : "glass-panel",
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold leading-tight">
            {group.exercise.name}
          </h2>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            {group.exercise.muscle_group}
          </p>
        </div>
        <button
          onClick={() => removeExercise(exerciseId)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-white/5 hover:text-destructive"
          aria-label="Remove exercise"
        >
          <Icon name="more_vert" className="text-[18px]" />
        </button>
      </div>

      {/* Set header row */}
      {group.sets.length > 0 && (
        <div className="grid grid-cols-[28px_1fr_80px_80px_36px] gap-2 border-b border-border pb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>#</span>
          <span>Prev</span>
          <span className="text-center">Weight</span>
          <span className="text-center">Reps</span>
          <span />
        </div>
      )}

      {group.sets.map((s, i) => (
        <SetRow key={s.id} exerciseId={exerciseId} setId={s.id} index={i} />
      ))}

      <button
        onClick={() => void useWorkout.getState().addSet(exerciseId)}
        className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border py-2 text-xs text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
      >
        <Icon name="add" className="text-[14px]" /> Add Set
      </button>
    </div>
  );
}

function SetRow({
  exerciseId,
  setId,
  index,
}: {
  exerciseId: string;
  setId: string;
  index: number;
}) {
  const set = useWorkout((s) =>
    s.active?.groups
      .find((g) => g.exercise.id === exerciseId)
      ?.sets.find((x) => x.id === setId),
  );
  const units = useWorkout((s) => s.units);
  const update = useWorkout((s) => s.updateSet);
  const toggle = useWorkout((s) => s.toggleSetDone);
  const removeSet = useWorkout((s) => s.removeSet);
  const bump = useWorkout((s) => s.bumpWeight);
  if (!set) return null;
  const inc = setBumpUnits(units);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg p-2 transition-colors",
        set.is_done && "bg-success/5",
      )}
    >
      {/* Row: set# | prev | weight | reps | done */}
      <div className="grid grid-cols-[28px_1fr_80px_80px_36px] items-center gap-2">
        <span className="text-center text-sm font-semibold text-muted-foreground">
          {index + 1}
        </span>
        <span className="truncate text-[10px] text-muted-foreground">
          {set.prev
            ? `${set.prev.weight} × ${set.prev.reps}`
            : "–"}
        </span>

        {/* Weight input */}
        <input
          inputMode="decimal"
          type="number"
          value={Number.isNaN(set.weight) ? 0 : set.weight}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) =>
            void update(exerciseId, setId, { weight: Number(e.target.value) })
          }
          className={cn(
            "h-10 rounded-lg border bg-secondary/60 px-2 text-center text-sm font-semibold tabular-nums text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/40",
            set.is_done ? "border-success/40" : "border-border",
          )}
        />

        {/* Reps input */}
        <input
          inputMode="numeric"
          type="number"
          value={Number.isNaN(set.reps) ? 0 : set.reps}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) =>
            void update(exerciseId, setId, { reps: Number(e.target.value) })
          }
          className={cn(
            "h-10 rounded-lg border bg-secondary/60 px-2 text-center text-sm font-semibold tabular-nums text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/40",
            set.is_done ? "border-success/40" : "border-border",
          )}
        />

        {/* Done toggle */}
        <button
          onClick={() => void toggle(exerciseId, setId)}
          aria-label={set.is_done ? "Mark incomplete" : "Mark complete"}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full border transition-all active:scale-90",
            set.is_done
              ? "glow-soft border-success bg-success text-white"
              : "border-border bg-transparent text-muted-foreground",
          )}
        >
          <Icon name="check" filled={set.is_done} className="text-[16px]" />
        </button>
      </div>

      {/* Weight bumpers + PR badge + delete */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex gap-1">
          {[-inc, -inc / 2, inc / 2, inc].map((delta) => (
            <button
              key={delta}
              onClick={() => void bump(exerciseId, setId, delta)}
              className="rounded-full border border-border bg-white/5 px-2.5 py-1 text-[11px] font-medium hover:bg-white/10 active:scale-95"
            >
              {delta > 0 ? "+" : ""}
              {delta}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {set.is_pr && (
            <span className="flex items-center gap-0.5 rounded-md border border-success/40 bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success">
              <Icon name="emoji_events" filled className="text-[10px]" />
              PR
            </span>
          )}
          <button
            onClick={() => void removeSet(exerciseId, setId)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white/5 hover:text-destructive"
            aria-label="Delete set"
          >
            <Icon name="more_vert" className="text-[14px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ExercisePicker({ onClose }: { onClose: () => void }) {
  const { exercises, addExercise } = useWorkout();
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [group, setGroup] = useState("Chest");
  const [adding, setAdding] = useState(false);

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(q.toLowerCase()),
  );

  const MUSCLE_GROUPS = [
    "Chest",
    "Back",
    "Legs",
    "Shoulders",
    "Arms",
    "Core",
    "Cardio",
  ];

  async function handleAdd() {
    if (name.trim().length < 2 || adding) return;
    setAdding(true);
    try {
      await addExercise(name.trim(), group);
      setName("");
      onClose();
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] flex-col bg-background/95 backdrop-blur-md">
      <header className="flex items-center justify-between border-b border-border px-4 pb-3 pt-10">
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/5"
        >
          <Icon name="arrow_back" className="text-[20px]" />
        </button>
        <p className="text-base font-bold">Add exercise</p>
        <div className="w-9" />
      </header>
      <div className="px-4 pt-4">
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
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {filtered.map((e) => (
          <button
            key={e.id}
            onClick={async () => {
              await addExercise(e.name, e.muscle_group);
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-md p-3 text-left hover:bg-white/5"
          >
            <div>
              <p className="text-sm font-semibold">{e.name}</p>
              <p className="text-xs text-muted-foreground">{e.muscle_group}</p>
            </div>
            <Icon
              name="chevron_right"
              className="text-[16px] text-muted-foreground"
            />
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No matches.
          </p>
        )}
      </div>
      <div className="border-t border-border bg-background/95 p-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Or create new
        </p>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleAdd()}
            placeholder="Exercise name"
            className="h-10 flex-1 rounded-md border border-border bg-secondary/50 px-3 text-sm outline-none focus:border-primary"
          />
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="h-10 rounded-md border border-border bg-secondary/50 px-2 text-sm outline-none focus:border-primary"
          >
            {MUSCLE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <button
            disabled={name.trim().length < 2 || adding}
            onClick={() => void handleAdd()}
            className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {adding ? "…" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
