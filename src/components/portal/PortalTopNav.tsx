"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ClipboardList, Users, Calendar, BarChart3, CheckSquare, LogOut, ChevronDown } from "lucide-react";
import { useState } from "react";
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
];

function canSee(roles: string[], role?: string) {
  if (roles.includes("all")) return true;
  return role ? roles.includes(role) : false;
}

export default function PortalTopNav({ profile }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const visible = NAV.filter(n => canSee(n.roles, profile?.role));
  const displayName = profile?.preferred_name || profile?.full_name?.split(" ")[0] || "You";
  const initial = displayName.charAt(0).toUpperCase();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="flex-shrink-0 border-b px-6 flex items-center gap-6 h-14" style={{
      background: "var(--p-header)",
      borderColor: "var(--p-border)",
      fontFamily: "var(--font-dm-sans)",
    }}>
      <Link href="/" className="flex items-center gap-2 mr-2 flex-shrink-0">
        <Image src="/logo.png" alt="MIST Dallas" width={26} height={26} className="object-contain" style={{ filter: "var(--p-bg)" === "#F0F4F8" ? "none" : "brightness(0) invert(1)" }} />
      </Link>

      <nav className="flex items-center gap-1 flex-1">
        {visible.map(item => {
          const active = item.href === "/portal" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
              style={{
                background: active ? "var(--p-accent)" + "20" : "transparent",
                color: active ? "var(--p-accent)" : "var(--p-muted)",
              }}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="relative">
        <button onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-150"
          style={{ background: menuOpen ? "var(--p-border)" : "transparent" }}>
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#2E7BC4] to-[#2EA87A] flex items-center justify-center text-xs font-bold text-white">
            {initial}
          </div>
          <span className="text-sm font-medium" style={{ color: "var(--p-text)" }}>{displayName}</span>
          <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--p-muted)" }} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl border shadow-xl overflow-hidden z-50"
            style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--p-border)" }}>
              <div className="text-xs font-semibold" style={{ color: "var(--p-text)" }}>{displayName}</div>
              <div className="text-xs" style={{ color: "var(--p-muted)" }}>{profile?.role?.replace(/_/g, " ")}</div>
            </div>
            <button onClick={signOut}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors"
              style={{ color: "var(--p-muted)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--p-card-hover)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
