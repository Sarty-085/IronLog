import { cn } from "@/lib/utils";
import * as React from "react";

export const GlassPanel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("glass-panel rounded-lg", className)}
    {...props}
  />
));
GlassPanel.displayName = "GlassPanel";
