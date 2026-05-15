import { cn } from "@/lib/utils";
import { BottomNav } from "./BottomNav";

/**
 * MobileShell renders the app inside a 480px-max phone-like frame so the
 * mobile-first design reads correctly on desktop preview AND on real phones.
 */
export function MobileShell({
  children,
  showNav = true,
  className,
}: {
  children: React.ReactNode;
  showNav?: boolean;
  className?: string;
}) {
  return (
    <div className="min-h-dvh w-full bg-background text-foreground flex justify-center">
      <div
        className={cn(
          "relative w-full max-w-[480px] min-h-dvh flex flex-col bg-background",
          "border-x border-border/40",
          className,
        )}
      >
        {children}
        {showNav && <BottomNav />}
      </div>
    </div>
  );
}
