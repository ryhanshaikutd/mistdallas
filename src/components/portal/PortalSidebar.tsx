"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ClipboardList, Users, Calendar, BarChart3, CheckSquare, Settings, LogOut } from "lucide-react";
import type { Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface Props { profile: Profile | null }

const NAV = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard, roles: ["all"] },
  { href: "/portal/apply", label: "Apply", icon: ClipboardList, roles: ["applicant", "all"] },
  { href: "/portal/review", label: "Applications", icon: Users, roles: ["regional_director", "internal_ad", "external_ad"] },
  { href: "/portal/interviews", label: "Interviews", icon: Calendar, roles: ["regional_director", "internal_ad", "external_ad"] },
  { href: "/portal/planning", label: "Planning", icon: CheckSquare, roles: ["regional_director", "internal_ad", "external_ad", "director", "chair", "lead"] },
  { href: "/portal/insights", label: "Insights", icon: BarChart3, roles: ["regional_director", "internal_ad", "external_ad", "director"] },
  { href: "/portal/settings", label: "Settings", icon: Settings, roles: ["all"] },
];

function canSee(roles: string[], role?: string) {
  if (roles.includes("all")) return true;
  return role ? roles.includes(role) : false;
}

export default function PortalSidebar({ profile }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const visible = NAV.filter(n => canSee(n.roles, profile?.role));
  const displayName = profile?.preferred_name || profile?.full_name?.split(" ")[0] || "You";
  const initial = displayName.charAt(0).toUpperCase();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 border-r" style={{
      background: "var(--p-sidebar)",
      borderColor: "rgba(255,255,255,0.06)",
      fontFamily: "var(--font-dm-sans)",
    }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="MIST Dallas" width={30} height={30} className="object-contain brightness-0 invert opacity-90" />
          <span className="font-bold text-sm text-white" style={{ fontFamily: "var(--font-syne)" }}>MIST Dallas</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {visible.map(item => {
          const Icon = item.icon;
          const active = item.href === "/portal" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                background: active ? "var(--p-sidebar-active)" : "transparent",
                color: active ? "#ffffff" : "rgba(255,255,255,0.45)",
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--p-sidebar-hover)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)"; }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)"; } }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#2EA87A]" />}
            </Link>
          );
        })}
      </nav>

      {/* Profile */}
      <div className="px-3 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3 px-3 py-2.5 mb-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2E7BC4] to-[#2EA87A] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">{displayName}</div>
            <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.3)" }}>{profile?.role?.replace(/_/g, " ")}</div>
          </div>
        </div>
        <button onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-150"
          style={{ color: "rgba(255,255,255,0.3)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.3)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>
    </aside>
  );
}
