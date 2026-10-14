import { LayoutDashboard, ClipboardList, Users, Calendar, BarChart3, CheckSquare, Settings, type LucideIcon } from "lucide-react";
import { LEADERSHIP_ROLES } from "@/lib/constants";

export interface PortalNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Roles that see the link; "all" means everyone. */
  roles: readonly string[];
}

const ALL = ["all"] as const;

export const PORTAL_NAV: readonly PortalNavItem[] = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard, roles: ALL },
  { href: "/portal/apply", label: "Apply", icon: ClipboardList, roles: ALL },
  { href: "/portal/review", label: "Applications", icon: Users, roles: LEADERSHIP_ROLES },
  { href: "/portal/interviews", label: "Interviews", icon: Calendar, roles: LEADERSHIP_ROLES },
  { href: "/portal/planning", label: "Planning", icon: CheckSquare, roles: [...LEADERSHIP_ROLES, "director", "chair", "lead"] },
  { href: "/portal/insights", label: "Insights", icon: BarChart3, roles: [...LEADERSHIP_ROLES, "director"] },
  { href: "/portal/settings", label: "Settings", icon: Settings, roles: ALL },
];

export function visibleNav(role: string | undefined, opts: { includeSettings?: boolean } = {}) {
  return PORTAL_NAV.filter((item) => {
    if (!opts.includeSettings && item.href === "/portal/settings") return false;
    return item.roles.includes("all") || (!!role && item.roles.includes(role));
  });
}

export function isActivePath(pathname: string, href: string) {
  return href === "/portal" ? pathname === href : pathname.startsWith(href);
}
