import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/store/auth";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — IronLog" },
      { name: "description", content: "Create your IronLog account and start tracking." },
    ],
  }),
  component: Signup,
});

function Signup() {
  const nav = useNavigate();
  const signup = useAuth((s) => s.signup);
  const [name, setName] = useState("");
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
          <p className="text-2xl font-bold tracking-tight">IRONLOG</p>
        </div>

        <h1 className="text-3xl font-bold leading-tight">Build your log.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Start tracking lifts in 30 seconds.</p>

        <form
          className="mt-8 flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setErr(null);
            setLoading(true);
            try {
              if (name.trim().length < 2) throw new Error("Name is too short");
              if (password.length < 4) throw new Error("Password is too short");
              await signup(name.trim(), email, password);
              nav({ to: "/" });
            } catch (ex) {
              setErr(ex instanceof Error ? ex.message : "Sign up failed");
            } finally {
              setLoading(false);
            }
          }}
        >
          <Input label="Name" icon="person" value={name} onChange={setName} />
          <Input label="Email" icon="mail" type="email" value={email} onChange={setEmail} />
          <Input label="Password" icon="lock" type="password" value={password} onChange={setPassword} />

          {err && <p className="text-xs text-destructive">{err}</p>}

          <button
            disabled={loading}
            className="glow-primary mt-2 flex h-12 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create account"}
          </button>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already a member?{" "}
            <Link to="/login" className="font-semibold text-primary">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </MobileShell>
  );
}

function Input({
  label, icon, value, onChange, type = "text",
}: { label: string; icon: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="relative">
        <Icon name={icon} className="!text-base absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type={type}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full rounded-lg border border-border bg-secondary/50 px-4 pl-10 text-sm outline-none focus:border-primary"
        />
      </div>
    </label>
  );
}
