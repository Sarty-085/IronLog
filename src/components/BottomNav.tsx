import { Link, useLocation } from "@tanstack/react-router";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Dash", icon: "dashboard" },
  { to: "/workout", label: "Workout", icon: "fitness_center" },
  { to: "/history", label: "History", icon: "history" },
  { to: "/library", label: "Library", icon: "menu_book" },
  { to: "/analytics", label: "Stats", icon: "monitoring" },
  { to: "/profile", label: "Profile", icon: "person" },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      className="sticky bottom-0 z-40 mt-auto flex w-full items-stretch gap-1 border-t border-border bg-background/90 px-2 pb-[max(env(safe-area-inset-bottom),16px)] pt-2 backdrop-blur-md"
      aria-label="Primary"
    >
      {items.map((it) => {
        const active =
          it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
        return (
          <Link
            key={it.to}
            to={it.to}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md py-1 text-[10px] tracking-wide transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon name={it.icon} filled={active} className="!text-[22px]" />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
