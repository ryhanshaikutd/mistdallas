import {
  LayoutDashboard, BookOpen, Calendar, Users, ClipboardList, UserCheck, Video, Flag, TrendingUp, Contact,
  CheckSquare, MessageSquare, BookMarked, Radar, Briefcase, Megaphone, Lightbulb, BarChart3, Settings,
  type LucideIcon,
} from "lucide-react";
import { BOARD_ROLES, DIRECTOR_PLUS, LEADERSHIP_ROLES, TEAM_MANAGERS } from "@/lib/constants";

export type NavGroup = "main" | "recruiting" | "season" | "leadership";

export interface PortalNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: NavGroup;
  /** Roles that see the link; "all" means everyone. */
  roles: readonly string[];
}

const ALL = ["all"] as const;

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  main: "Main",
  recruiting: "Recruiting",
  season: "Season",
  leadership: "Leadership",
};
const GROUP_ORDER: NavGroup[] = ["main", "recruiting", "season", "leadership"];

export const PORTAL_NAV: readonly PortalNavItem[] = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard, group: "main", roles: ALL },
  { href: "/portal/workbook", label: "Workbook", icon: BookOpen, group: "main", roles: BOARD_ROLES },
  { href: "/portal/calendar", label: "Calendar", icon: Calendar, group: "main", roles: BOARD_ROLES },
  { href: "/portal/teams", label: "Teams", icon: Users, group: "main", roles: BOARD_ROLES },
  { href: "/portal/apply", label: "Apply", icon: ClipboardList, group: "recruiting", roles: ALL },
  { href: "/portal/review", label: "Applications", icon: UserCheck, group: "recruiting", roles: LEADERSHIP_ROLES },
  { href: "/portal/interviews", label: "Interviews", icon: Video, group: "recruiting", roles: LEADERSHIP_ROLES },
  { href: "/portal/timeline", label: "Timeline", icon: Flag, group: "season", roles: BOARD_ROLES },
  { href: "/portal/progress", label: "Progress", icon: TrendingUp, group: "season", roles: BOARD_ROLES },
  { href: "/portal/directory", label: "Directory", icon: Contact, group: "season", roles: BOARD_ROLES },
  { href: "/portal/planning", label: "Planning", icon: CheckSquare, group: "season", roles: TEAM_MANAGERS },
  { href: "/portal/meetings", label: "Meetings", icon: MessageSquare, group: "season", roles: BOARD_ROLES },
  { href: "/portal/handbook", label: "Handbook", icon: BookMarked, group: "season", roles: BOARD_ROLES },
  { href: "/portal/command", label: "Command Center", icon: Radar, group: "leadership", roles: DIRECTOR_PLUS },
  { href: "/portal/positions", label: "Positions", icon: Briefcase, group: "leadership", roles: LEADERSHIP_ROLES },
  { href: "/portal/announcements", label: "Announcements", icon: Megaphone, group: "leadership", roles: LEADERSHIP_ROLES },
  { href: "/portal/feedback", label: "Feedback", icon: Lightbulb, group: "leadership", roles: LEADERSHIP_ROLES },
  { href: "/portal/insights", label: "Insights", icon: BarChart3, group: "leadership", roles: DIRECTOR_PLUS },
  { href: "/portal/settings", label: "Settings", icon: Settings, group: "main", roles: ALL },
];

export function visibleNav(role: string | undefined, opts: { includeSettings?: boolean } = {}) {
  return PORTAL_NAV.filter((item) => {
    if (!opts.includeSettings && item.href === "/portal/settings") return false;
    return item.roles.includes("all") || (!!role && item.roles.includes(role));
  });
}

export function navGroups(role: string | undefined, opts: { includeSettings?: boolean } = {}) {
  const items = visibleNav(role, opts);
  return GROUP_ORDER.map((group) => ({
    group,
    label: NAV_GROUP_LABELS[group],
    items: items.filter((i) => i.group === group),
  })).filter((g) => g.items.length > 0);
}

export function isActivePath(pathname: string, href: string) {
  return href === "/portal" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

/** Page title for the header: the nav label whose href is the longest prefix of the path. */
export function titleFor(pathname: string): string {
  let best: PortalNavItem | undefined;
  for (const item of PORTAL_NAV) {
    if (isActivePath(pathname, item.href) && (!best || item.href.length > best.href.length)) best = item;
  }
  return best?.label ?? "Portal";
}
