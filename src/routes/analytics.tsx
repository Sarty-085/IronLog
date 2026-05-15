import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MobileShell } from "@/components/MobileShell";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/store/auth";
import { useWorkout } from "@/store/workout";
import { api, type ApiPR, type ApiVolumeSeries, type ApiFrequencySeries, type ApiMuscleVolume } from "@/lib/api";
import { formatWeight } from "@/lib/units";
import { cn } from "@/lib/utils";

const TABS = ["Volume", "1RM", "Frequency"] as const;

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — IronLog" },
      {
        name: "description",
        content: "Volume, 1RM and consistency analytics for your training.",
      },
    ],
  }),
  component: Analytics,
});

function Analytics() {
  const nav = useNavigate();
  const { user, hydrated } = useAuth();
  const { units, loadAll } = useWorkout();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Volume");

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      nav({ to: "/login" });
      return;
    }
    void loadAll();
  }, [hydrated, user, loadAll, nav]);

  const enabled = !!user && hydrated;

  const { data: volumeSeries = [], isLoading: volLoading } = useQuery({
    queryKey: ["analytics", "volume", 30],
    queryFn: () => api.getVolumeSeries(30),
    enabled,
    staleTime: 60_000,
  });

  const { data: muscleVol = [], isLoading: muscleLoading } = useQuery({
    queryKey: ["analytics", "muscle-volume", 30],
    queryFn: () => api.getMuscleVolume(30),
    enabled,
    staleTime: 60_000,
  });

  const { data: freqSeries = [], isLoading: freqLoading } = useQuery({
    queryKey: ["analytics", "frequency", 70],
    queryFn: () => api.getFrequency(70),
    enabled,
    staleTime: 60_000,
  });

  const { data: prs = [], isLoading: prLoading } = useQuery({
    queryKey: ["analytics", "prs"],
    queryFn: () => api.getPRs(),
    enabled,
    staleTime: 60_000,
  });

  const { data: summary } = useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: () => api.getSummary(),
    enabled,
    staleTime: 60_000,
  });

  const totalVol30 = summary?.monthly_volume ?? 0;
  const change30 = summary?.weekly_pct_change ?? 0;

  const loading = volLoading || freqLoading || prLoading || muscleLoading;
  const isEmpty =
    !loading &&
    volumeSeries.every((p) => p.volume === 0) &&
    prs.length === 0;

  return (
    <MobileShell>
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 px-6 pb-2 pt-10 backdrop-blur-md">
        <h1 className="text-xl font-bold tracking-tight">Analytics</h1>
        <div className="mt-3 flex gap-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "relative pb-2 text-sm font-semibold transition-colors",
                tab === t ? "text-primary" : "text-muted-foreground",
              )}
            >
              {t}
              {tab === t && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-28">
        {loading && (
          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading analytics…</p>
          </div>
        )}

        {!loading && isEmpty && <EmptyState />}

        {!loading && !isEmpty && tab === "Volume" && (
          <VolumeTab
            total={totalVol30}
            change={change30}
            series={volumeSeries}
            units={units}
            muscle={muscleVol}
          />
        )}

        {!loading && !isEmpty && tab === "1RM" && (
          <PrTab prs={prs} units={units} />
        )}

        {!loading && !isEmpty && tab === "Frequency" && (
          <FrequencyTab freq={freqSeries} summary={summary} />
        )}
      </main>
    </MobileShell>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 flex flex-col items-center gap-3 px-6 text-center">
      <Icon name="monitoring" className="text-[32px] text-muted-foreground" />
      <p className="text-base font-semibold">No analytics available yet</p>
      <p className="text-sm text-muted-foreground">
        Charts will populate as soon as you finish your first workout.
      </p>
    </div>
  );
}

// ── Volume chart (SVG) ────────────────────────────────────────────────────

function VolumeChart({
  series,
  units,
}: {
  series: ApiVolumeSeries;
  units: string;
}) {
  const w = 320;
  const h = 180;
  const nonZero = series.filter((p) => p.volume > 0);
  if (nonZero.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        No volume recorded in this period.
      </p>
    );
  }
  const max = Math.max(1, ...series.map((p) => p.volume));
  const path = series
    .map((p, i) => {
      const x = (i / Math.max(1, series.length - 1)) * w;
      const y = h - (p.volume / max) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `${path} L${w} ${h} L0 ${h} Z`;
  const lastIdx = series.length - 1;
  const last = series[lastIdx];
  return (
    <svg viewBox={`0 0 ${w} ${h + 24}`} className="w-full">
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1={0}
          x2={w}
          y1={(h / 3) * i}
          y2={(h / 3) * i}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="3 3"
        />
      ))}
      <defs>
        <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#1085f9" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#1085f9" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#grad)" />
      <path
        d={path}
        fill="none"
        stroke="#1085f9"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {last && last.volume > 0 && (
        <circle
          cx={w}
          cy={h - (last.volume / max) * h}
          r="4"
          fill="#1085f9"
        />
      )}
      <g fontFamily="JetBrains Mono" fontSize="9" fill="#A1A1AA">
        <text x={0} y={h + 16}>
          {formatShortDate(series[0]?.date)}
        </text>
        <text x={w / 2 - 16} y={h + 16}>
          {formatShortDate(series[Math.floor(lastIdx / 2)]?.date)}
        </text>
        <text x={w - 30} y={h + 16}>
          {formatShortDate(last?.date)}
        </text>
      </g>
      <title>{`Last ${series.length} days, max ${Math.round(max).toLocaleString()} ${units}`}</title>
    </svg>
  );
}

function formatShortDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  });
}

// ── Volume tab ────────────────────────────────────────────────────────────

function VolumeTab({
  total,
  change,
  series,
  units,
  muscle,
}: {
  total: number;
  change: number;
  series: ApiVolumeSeries;
  units: string;
  muscle: ApiMuscleVolume;
}) {
  const maxMuscle = Math.max(1, ...muscle.map((m) => m.volume));
  return (
    <>
      <div className="glass-panel rounded-lg p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Total Volume (Past 30 Days)
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              {Math.round(total).toLocaleString()}{" "}
              <span className="text-base font-normal text-muted-foreground">
                {units}
              </span>
            </p>
          </div>
          <span
            className={cn(
              "flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium",
              change >= 0
                ? "border-success/40 bg-success/10 text-success"
                : "border-destructive/40 bg-destructive/10 text-destructive",
            )}
          >
            <Icon name="trending_up" className="text-[12px]" />
            {change >= 0 ? "+" : ""}
            {change.toFixed(1)}%
          </span>
        </div>
        <div className="mt-5">
          <VolumeChart series={series} units={units} />
        </div>
      </div>

      {muscle.length > 0 && (
        <div className="glass-panel mt-4 rounded-lg p-5">
          <p className="text-base font-bold">Muscle Group Volume</p>
          <div className="mt-3 flex flex-col gap-2">
            {muscle.map((m) => {
              const pct = (m.volume / maxMuscle) * 100;
              return (
                <div key={m.group} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span>{m.group}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatWeight(m.volume, units as "lbs" | "kg")}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

// ── 1RM / PR tab ──────────────────────────────────────────────────────────

function PrTab({
  prs,
  units,
}: {
  prs: ApiPR[];
  units: "lbs" | "kg";
}) {
  if (prs.length === 0) {
    return (
      <p className="px-2 py-12 text-center text-sm text-muted-foreground">
        Log at least one completed set to estimate 1RM.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="px-1 text-xs text-muted-foreground">
        Estimated 1RM via Epley: weight × (1 + reps / 30).
      </p>
      {prs.map((p) => (
        <div
          key={p.exercise_id}
          className="glass-panel flex items-center gap-3 rounded-lg p-4"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-secondary/40">
            <Icon
              name="emoji_events"
              filled
              className="text-[20px] text-primary"
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">{p.exercise_name}</p>
            <p className="text-xs text-muted-foreground">
              {p.best_weight} {units} × {p.best_reps} •{" "}
              {new Date(p.achieved_at).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold tabular-nums">
              {formatWeight(p.one_rm, units)}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              1RM
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Frequency / heatmap tab ───────────────────────────────────────────────

function FrequencyTab({
  freq,
  summary,
}: {
  freq: ApiFrequencySeries;
  summary: { total_workouts: number; current_streak: number; weekly_volume: number } | undefined;
}) {
  const week = freq.slice(-7).reduce((s, d) => s + d.count, 0);
  const month = freq.slice(-30).reduce((s, d) => s + d.count, 0);

  // 7×10 grid — rows=weekdays (Mon→Sun), cols=oldest→newest week
  const cells: { count: number; date: string }[] = [];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 10; col++) {
      const idx = col * 7 + row;
      cells.push({
        count: freq[idx]?.count ?? 0,
        date: freq[idx]?.date ?? "",
      });
    }
  }

  const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="This Week"
          value={`${week}`}
          sub={week === 1 ? "session" : "sessions"}
        />
        <Stat
          label="Last 30 Days"
          value={`${month}`}
          sub={month === 1 ? "session" : "sessions"}
        />
      </div>

      {summary && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stat
            label="Total Workouts"
            value={`${summary.total_workouts}`}
            sub="all time"
          />
          <Stat
            label="Current Streak"
            value={`${summary.current_streak}`}
            sub={summary.current_streak === 1 ? "day" : "days"}
          />
        </div>
      )}

      <div className="glass-panel mt-4 rounded-lg p-5">
        <p className="text-base font-bold">Consistency</p>
        <div className="mt-4 flex gap-2">
          {/* Day labels column */}
          <div className="flex flex-col gap-1.5 pr-1 pt-0.5">
            {DAY_LABELS.map((d, i) => (
              <div
                key={i}
                className="flex h-5 w-3 items-center justify-center text-[8px] text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>
          {/* Heatmap grid */}
          <div className="grid flex-1 grid-cols-10 gap-1.5">
            {cells.map((c, i) => {
              const v = c.count >= 2 ? 3 : c.count === 1 ? 2 : 0;
              return (
                <div
                  key={i}
                  title={
                    c.date
                      ? `${c.date}: ${c.count} workout(s)`
                      : `${c.count} workout(s)`
                  }
                  className="aspect-square rounded-[3px]"
                  style={{
                    backgroundColor:
                      v === 0
                        ? "rgba(255,255,255,0.05)"
                        : v === 2
                          ? "rgba(16,133,249,0.55)"
                          : "#1085f9",
                    boxShadow:
                      v === 3 ? "0 0 8px rgba(16,133,249,0.5)" : undefined,
                  }}
                />
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 1, 2].map((v) => (
              <div
                key={v}
                className="h-3 w-3 rounded-[3px]"
                style={{
                  backgroundColor:
                    v === 0
                      ? "rgba(255,255,255,0.05)"
                      : v === 1
                        ? "rgba(16,133,249,0.55)"
                        : "#1085f9",
                }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="glass-panel flex flex-col rounded-lg p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
