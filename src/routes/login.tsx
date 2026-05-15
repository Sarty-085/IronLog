import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/store/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — IronLog" },
      { name: "description", content: "Sign in to IronLog and resume your training." },
    ],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <MobileShell showNav={false}>
      <div className="flex flex-1 flex-col px-6 pt-20">
        <div className="mb-10 flex items-center gap-3">
          <div className="glow-primary flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Icon name="fitness_center" filled className="!text-2xl" />
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight">IRONLOG</p>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Graphite • v2.4</p>
          </div>
        </div>

        <h1 className="text-3xl font-bold leading-tight">Welcome back.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Log in to keep the streak alive.</p>

        <form
          className="mt-8 flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setErr(null);
            setLoading(true);
            try {
              await login(email, password);
              nav({ to: "/" });
            } catch (ex) {
              setErr(ex instanceof Error ? ex.message : "Sign in failed");
            } finally {
              setLoading(false);
            }
          }}
        >
          <Field label="Email" icon="mail">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-lg border border-border bg-secondary/50 px-4 pl-10 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Password" icon="lock">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-lg border border-border bg-secondary/50 px-4 pl-10 text-sm outline-none focus:border-primary"
            />
          </Field>

          {err && <p className="text-xs text-destructive">{err}</p>}

          <button
            disabled={loading}
            className="glow-primary mt-2 flex h-12 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            New to IronLog?{" "}
            <Link to="/signup" className="font-semibold text-primary">
              Create account
            </Link>
          </p>
        </form>
      </div>
    </MobileShell>
  );
}

function Field({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="relative">
        <Icon name={icon} className="!text-base absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        {children}
      </div>
    </label>
  );
}
