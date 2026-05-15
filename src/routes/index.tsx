import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MobileShell } from "@/components/MobileShell";
import { GlassPanel } from "@/components/Glass";
import { Icon } from "@/components/Icon";
import { useWorkout } from "@/store/workout";
import { useAuth } from "@/store/auth";
import { workoutVolume } from "@/lib/analytics";
import { formatWeight } from "@/lib/units";
import { api } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — IronLog" },
      {
        name: "description",
        content:
          "Your training overview: streak, weekly volume, and next workout.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const nav = useNavigate();
  const { user, hydrated } = useAuth();
  const { history, units, loadAll, startWorkout, active, loading } =
    useWorkout();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      nav({ to: "/login" });
      return;
    }
    void loadAll();
  }, [hydrated, user, loadAll, nav]);

  const enabled = !!user && hydrated;

  const { data: summary } = useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: () => api.getSummary(),
    enabled,
    staleTime: 60_000,
  });

  const weeklyVol = summary?.weekly_volume ?? 0;
  const change = summary?.weekly_pct_change ?? 0;
  const streak = summary?.current_streak ?? 0;

  const recent = useMemo(() => history.slice(0, 3), [history]);
  const firstName = (user?.name ?? "Athlete").split(" ")[0];

  return (
    <MobileShell>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-6 pb-4 pt-10 backdrop-blur-md">
        <h1 className="text-xl font-bold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-white/5 px-3 py-1.5">
          <Icon name="flame" filled className="text-[14px] text-orange-400" />
          <span className="text-sm font-medium tracking-tight">
            {streak} {streak === 1 ? "Day" : "Days"}
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 px-4 py-6 pb-40">
        <div className="grid grid-cols-2 gap-4">
          <GlassPanel className="relative flex flex-col gap-3 overflow-hidden p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Weekly Vol
              </h2>
              <Icon
                name="monitoring"
                className="text-[16px] text-muted-foreground"
              />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-2xl font-bold tabular-nums">
                {weeklyVol >= 1000
                  ? `${(weeklyVol / 1000).toFixed(1)}k`
                  : weeklyVol.toLocaleString()}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  {units}
                </span>
              </p>
              <p
                className={`flex items-center gap-1 text-xs font-medium ${
                  change >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                <Icon
                  name="arrow_upward"
                  filled
                  className={`text-[12px] ${change < 0 ? "rotate-180" : ""}`}
                />
                {change >= 0 ? "+" : ""}
                {change.toFixed(1)}%
              </p>
            </div>
          </GlassPanel>

          <GlassPanel className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Up Next
              </h2>
              <Icon
                name="fitness_center"
                className="text-[16px] text-muted-foreground"
              />
            </div>
            <div className="mt-auto flex flex-col gap-2">
              <p className="text-xl font-bold leading-tight">
                {active ? active.name : "New Session"}
              </p>
              <p className="text-xs text-muted-foreground">
                {active
                  ? `${active.groups.length} exercises • in progress`
                  : "Tap below to begin"}
              </p>
            </div>
          </GlassPanel>
        </div>

        <section className="mt-2 flex flex-col gap-3">
          <h3 className="px-1 text-sm font-medium text-muted-foreground">
            Recent Sessions
          </h3>
          {loading && history.length === 0 && (
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          )}
          {!loading && recent.length === 0 && (
            <GlassPanel className="flex flex-col items-center gap-2 p-8 text-center">
              <Icon
                name="fitness_center"
                className="text-[28px] text-muted-foreground"
              />
              <p className="text-sm font-semibold">No workouts logged yet</p>
              <p className="text-xs text-muted-foreground">
                Start your first session to see it here.
              </p>
            </GlassPanel>
          )}
          {recent.map((h, i) => {
            const vol = workoutVolume(h);
            return (
              <Link
                key={h.id}
                to="/history"
                className={`glass-panel flex cursor-pointer items-center justify-between rounded-lg p-4 transition-colors hover:bg-white/5 ${
                  i === 0 ? "border-l-2 border-l-primary" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white/5">
                    <Icon
                      name="fitness_center"
                      className="text-[18px] text-foreground"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{h.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(h.started_at).toLocaleDateString("en-US", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      })}{" "}
                      • {formatWeight(vol, units)}
                    </p>
                  </div>
                </div>
                <Icon
                  name="chevron_right"
                  className="text-[16px] text-muted-foreground"
                />
              </Link>
            );
          })}
        </section>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-[80px] z-30 mx-auto flex max-w-[480px] justify-center bg-gradient-to-t from-background via-background/90 to-transparent px-4 pb-3 pt-8">
        <button
          onClick={async () => {
            if (!active) await startWorkout("New Workout");
            nav({ to: "/workout" });
          }}
          className="glow-primary pointer-events-auto flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold tracking-wide text-primary-foreground transition-transform active:scale-[0.98]"
        >
          <Icon name="play_arrow" filled className="text-[18px]" />
          {active ? "Resume Workout" : "Start Workout"}
        </button>
      </div>
    </MobileShell>
  );
}
