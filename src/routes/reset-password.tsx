import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Set New Password — IronLog" }],
  }),
  validateSearch: (search: Record<string, unknown>) => {
    return { token: (search.token as string) || "" };
  },
  component: ResetPassword,
});

function ResetPassword() {
  const { token } = Route.useSearch();
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <MobileShell showNav={false}>
      <div className="flex flex-1 flex-col px-6 pt-20">
        <h1 className="text-3xl font-bold leading-tight">New Password</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter a new secure password.</p>

        {!token ? (
           <p className="mt-8 text-destructive">No reset token provided in URL.</p>
        ) : (
          <form
            className="mt-8 flex flex-col gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setErr(null);
              setLoading(true);
              try {
                const res = await fetch("http://localhost:8000/auth/reset-password", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ token, new_password: password }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || "Reset failed");
                setMsg(data.detail);
                setTimeout(() => nav({ to: "/login" }), 2000);
              } catch (ex) {
                setErr(ex instanceof Error ? ex.message : "Reset failed");
              } finally {
                setLoading(false);
              }
            }}
          >
            <Field label="New Password" icon="lock">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-lg border border-border bg-secondary/50 px-4 pl-10 text-sm outline-none focus:border-primary"
              />
            </Field>

            {err && <p className="text-xs text-destructive">{err}</p>}
            {msg && <p className="text-xs text-green-500">{msg}</p>}

            <button
              disabled={loading}
              className="glow-primary mt-2 flex h-12 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              <Link to="/login" className="font-semibold text-primary">
                Back to login
              </Link>
            </p>
          </form>
        )}
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
