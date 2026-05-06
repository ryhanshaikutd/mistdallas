"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Calendar,
  BarChart3,
  CheckSquare,
  LogOut,
  ChevronRight,
} from "lucide-react";
import type { Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Props {
  profile: Profile | null;
}

const NAV = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard, roles: ["all"] },
  { href: "/portal/apply", label: "Apply", icon: ClipboardList, roles: ["applicant", "all"] },
  {
    href: "/portal/review",
    label: "Applications",
    icon: Users,
    roles: ["regional_director", "internal_ad", "external_ad"],
  },
  {
    href: "/portal/interviews",
    label: "Interviews",
    icon: Calendar,
    roles: ["regional_director", "internal_ad", "external_ad"],
  },
  {
    href: "/portal/planning",
    label: "Planning",
    icon: CheckSquare,
    roles: ["regional_director", "internal_ad", "external_ad", "director", "chair", "lead"],
  },
  {
    href: "/portal/insights",
    label: "Insights",
    icon: BarChart3,
    roles: ["regional_director", "internal_ad", "external_ad", "director"],
  },
];

function canSee(navRoles: string[], userRole: string | undefined) {
  if (navRoles.includes("all")) return true;
  if (!userRole) return false;
  return navRoles.includes(userRole);
}

export default function PortalSidebar({ profile }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const visibleNav = NAV.filter((n) => canSee(n.roles, profile?.role));

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-[#2D2F3A] text-white flex-shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <Image src="/logo.png" alt="MIST Dallas" width={30} height={30} className="object-contain" />
          </div>
          <div>
            <div className="font-bold text-sm">MIST Dallas</div>
            <div className="text-white/40 text-xs">Board Portal</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/portal" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
              {active && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* Profile + sign out */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2E7BC4] to-[#2EA87A] flex items-center justify-center text-xs font-bold flex-shrink-0">
            {profile?.full_name?.charAt(0) ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {profile?.full_name || "Board Member"}
            </div>
            <div className="text-xs text-white/40 truncate">{profile?.role?.replace(/_/g, " ")}</div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 text-white/50 hover:text-white text-sm rounded-xl hover:bg-white/5 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
