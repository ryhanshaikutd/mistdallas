"use client";

import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/types";

interface Props { profile: Profile | null }

const TITLES: Record<string, string> = {
  "/portal": "Dashboard",
  "/portal/apply": "Apply",
  "/portal/review": "Applications",
  "/portal/interviews": "Interviews",
  "/portal/planning": "Planning",
  "/portal/insights": "Insights",
};

export default function PortalHeader({ profile }: Props) {
  const pathname = usePathname();
  // Dashboard has its own greeting — no header needed there
  if (pathname === "/portal") return null;

  const title = Object.entries(TITLES).find(([key]) =>
    key === "/portal" ? pathname === key : pathname.startsWith(key)
  )?.[1] ?? "Portal";
  const displayName = profile?.preferred_name || profile?.full_name?.split(" ")[0] || "there";

  return (
    <header className="flex-shrink-0 border-b px-6 lg:px-8 h-14 flex items-center justify-between" style={{
      background: "var(--p-header)",
      borderColor: "var(--p-border)",
      fontFamily: "var(--font-dm-sans)",
    }}>
      <h1 className="text-base font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>
        {title}
      </h1>
      <div className="flex items-center gap-3">
        <span className="text-sm hidden sm:block" style={{ color: "var(--p-muted)" }}>
          Hey, {displayName}
        </span>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2E7BC4] to-[#2EA87A] flex items-center justify-center text-xs font-bold text-white">
          {displayName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
