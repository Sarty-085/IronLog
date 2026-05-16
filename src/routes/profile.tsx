import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MobileShell } from "@/components/MobileShell";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/store/auth";
import { useWorkout } from "@/store/workout";
import { api, type ApiPR } from "@/lib/api";
import { formatWeight } from "@/lib/units";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — IronLog" },
      {
        name: "description",
        content: "Your IronLog profile, settings, and achievements.",
      },
    ],
  }),
  component: Profile,
});

function Profile() {
  const nav = useNavigate();
  const { user, hydrated, logout } = useAuth();
  const { units, setUnits, loadAll } = useWorkout();
  const queryClient = useQueryClient();

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

  const { data: prs = [] } = useQuery<ApiPR[]>({
    queryKey: ["analytics", "prs"],
    queryFn: () => api.getPRs(),
    enabled,
    staleTime: 60_000,
  });

  const topPR = prs[0] ?? null;

  // Sync units from server profile on first load
  useEffect(() => {
    if (user?.units && user.units !== units) {
      setUnits(user.units);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.units]);

  async function handleSetUnits(u: "lbs" | "kg") {
    setUnits(u);
    try {
      await api.updateMe({ units: u });
      void queryClient.invalidateQueries({ queryKey: ["analytics"] });
    } catch {
      /* ignore */
    }
  }

  return (
    <MobileShell>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-4 pb-3 pt-10 backdrop-blur-md">
        <div className="w-9" />
        <h1 className="text-base font-bold tracking-tight">Settings</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 px-5 pb-28 pt-6">
        {/* Avatar */}
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary glow-soft bg-gradient-to-br from-primary/40 to-secondary">
              <Icon
                name="person"
                filled
                className="text-[40px] text-primary-foreground"
              />
            </div>
          </div>
          <p className="mt-4 text-xl font-bold">{user?.name ?? "Athlete"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {user?.email ?? ""}
          </p>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat
            value={String(summary?.total_workouts ?? 0)}
            label="Workouts"
          />
          <Stat
            value={
              (summary?.monthly_volume ?? 0) >= 1_000_000
                ? `${((summary?.monthly_volume ?? 0) / 1_000_000).toFixed(1)}M`
                : (summary?.monthly_volume ?? 0) >= 1000
                  ? `${((summary?.monthly_volume ?? 0) / 1000).toFixed(1)}k`
                  : String(Math.round(summary?.monthly_volume ?? 0))
            }
            label={`${units} vol.`}
          />
          <Stat
            value={String(summary?.current_streak ?? 0)}
            label="Streak"
            valueClass={
              (summary?.current_streak ?? 0) > 0 ? "text-success" : undefined
            }
          />
        </div>

        {/* Top PR */}
        <Section label="Top Personal Record">
          {topPR ? (
            <div className="glass-panel flex items-center gap-3 rounded-lg border-l-2 border-l-success p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-success/15">
                <Icon
                  name="military_tech"
                  filled
                  className="text-[22px] text-success"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">{topPR.exercise_name}</p>
                <p className="text-xs text-muted-foreground">
                  {topPR.best_weight} {units} × {topPR.best_reps}
                </p>
              </div>
              <p className="text-sm font-bold tabular-nums text-success">
                {formatWeight(topPR.one_rm, units)}
              </p>
            </div>
          ) : (
            <p className="px-1 text-xs text-muted-foreground">
              Log a few sets to unlock your first PR.
            </p>
          )}
        </Section>

        {/* Preferences */}
        <Section label="Preferences">
          <div className="glass-panel divide-y divide-border rounded-lg">
            <Row icon="straighten" label="Units">
              <div className="flex rounded-full border border-border p-0.5">
                {(["lbs", "kg"] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => void handleSetUnits(u)}
                    className={cn(
                      "rounded-full px-3 py-0.5 text-xs transition-colors",
                      units === u
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {u === "lbs" ? "Pounds" : "Kilograms"}
                  </button>
                ))}
              </div>
            </Row>
            <Row icon="dark_mode" label="Appearance">
              <span className="text-sm text-muted-foreground">
                Graphite Dark
              </span>
            </Row>
          </div>
        </Section>

        <button
          onClick={() => {
            logout();
            nav({ to: "/login" });
          }}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-destructive/40 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 active:scale-[0.98]"
        >
          <Icon name="logout" className="text-[16px]" />
          Sign Out
        </button>
        <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          IronLog v2.4.0
        </p>
      </main>
    </MobileShell>
  );
}

function Stat({
  value,
  label,
  valueClass,
}: {
  value: string;
  label: string;
  valueClass?: string;
}) {
  return (
    <div className="glass-panel flex flex-col items-center rounded-lg p-3">
      <p className={cn("text-xl font-bold text-primary", valueClass)}>
        {value}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7">
      <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {children}
    </section>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Icon name={icon} className="text-[18px] text-muted-foreground" />
      <span className="flex-1 text-sm">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
