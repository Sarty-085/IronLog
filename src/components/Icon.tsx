// Backwards-compatible icon component. Maps Material Symbols names used
// throughout the app to Lucide React icons, so existing call sites keep working.
import {
  Activity,
  ArrowLeft,
  ArrowUp,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  CircleUserRound,
  Crown,
  Download,
  Dumbbell,
  Flame,
  History as HistoryIcon,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Medal,
  Moon,
  MoreVertical,
  Play,
  Plus,
  Ruler,
  Search,
  Sparkles,
  TrendingUp,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const map: Record<string, LucideIcon> = {
  // dashboard / nav
  dashboard: LayoutDashboard,
  fitness_center: Dumbbell,
  exercise: Dumbbell,
  history: HistoryIcon,
  menu_book: BookOpen,
  monitoring: BarChart3,
  person: User,
  // actions
  add: Plus,
  play_arrow: Play,
  arrow_back: ArrowLeft,
  arrow_upward: ArrowUp,
  more_vert: MoreVertical,
  check: Check,
  search: Search,
  chevron_right: ChevronRight,
  download: Download,
  logout: LogOut,
  // status / accents
  trending_up: TrendingUp,
  emoji_events: Award,
  military_tech: Medal,
  verified: Sparkles,
  calendar_month: Calendar,
  notifications: Bell,
  dark_mode: Moon,
  lock: Lock,
  mail: Mail,
  straighten: Ruler,
  sports_martial_arts: Activity,
  directions_run: Activity,
  flame: Flame,
  crown: Crown,
  user_circle: CircleUserRound,
};

export function Icon({
  name,
  filled,
  className,
  style,
}: {
  name: string;
  filled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Cmp = map[name] ?? Dumbbell;
  // Translate the project's `!text-[Npx]` / `!text-lg` sizing convention into
  // an inline-friendly Lucide. Default 20px.
  // size="1em" → SVG scales with font-size, so existing `!text-lg` / `!text-[22px]`
  // utility classes on call sites continue to control icon dimensions.
  return (
    <Cmp
      aria-hidden
      size="1em"
      className={cn("inline-block shrink-0 text-[1.1em]", className)}
      style={style}
      strokeWidth={filled ? 2.5 : 2}
      fill={filled ? "currentColor" : "none"}
    />
  );
}
