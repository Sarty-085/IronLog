import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { useAuth } from "@/store/auth";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [{ title: "Welcome — IronLog" }],
  }),
  component: Onboarding,
});

function Onboarding() {
  const { user, token, setAuth } = useAuth();
  const nav = useNavigate();
  const [formData, setFormData] = useState({
    gender: "",
    birth_date: "",
    height: "",
    experience_level: "",
    weight: "",
    body_fat_pct: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/profile/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gender: formData.gender,
          birth_date: formData.birth_date ? new Date(formData.birth_date).toISOString() : null,
          height: formData.height ? parseFloat(formData.height) : null,
          experience_level: formData.experience_level,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          body_fat_pct: formData.body_fat_pct ? parseFloat(formData.body_fat_pct) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to save onboarding data");
      setAuth(token!, data); // Update user state with onboarding_completed = true
      nav({ to: "/" });
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileShell showNav={false}>
      <div className="flex flex-1 flex-col px-6 pt-12 pb-12">
        <h1 className="text-3xl font-bold leading-tight">Complete your profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We need a few details to calculate your Body Armory and personalize your insights.
        </p>

        <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Gender</span>
            <select
              required
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="h-12 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm outline-none focus:border-primary"
            >
              <option value="" disabled>Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Birth Date</span>
            <input
              type="date"
              required
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              className="h-12 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Height (cm)</span>
            <input
              type="number"
              required
              min="100"
              max="250"
              value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              className="h-12 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm outline-none focus:border-primary"
              placeholder="e.g. 175"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Experience Level</span>
            <select
              required
              value={formData.experience_level}
              onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
              className="h-12 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm outline-none focus:border-primary"
            >
              <option value="" disabled>Select Level</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="elite">Elite</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Current Weight (kg)</span>
            <input
              type="number"
              step="0.1"
              required
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              className="h-12 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm outline-none focus:border-primary"
              placeholder="e.g. 70.5"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Est. Body Fat % (Optional)</span>
            <input
              type="number"
              step="0.1"
              max="100"
              value={formData.body_fat_pct}
              onChange={(e) => setFormData({ ...formData, body_fat_pct: e.target.value })}
              className="h-12 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm outline-none focus:border-primary"
              placeholder="e.g. 15"
            />
          </div>

          {err && <p className="text-xs text-destructive">{err}</p>}

          <button
            disabled={loading}
            className="glow-primary mt-4 flex h-12 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "Saving..." : "Continue to Dashboard"}
          </button>
        </form>
      </div>
    </MobileShell>
  );
}
