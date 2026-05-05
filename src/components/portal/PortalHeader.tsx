"use client";

import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/types";
import { Bell } from "lucide-react";

interface Props {
  profile: Profile | null;
}

const TITLES: Record<string, string> = {
  "/portal": "Dashboard",
  "/portal/apply": "Apply for a Position",
  "/portal/review": "Application Review",
  "/portal/interviews": "Interview Scheduling",
  "/portal/planning": "Planning Board",
  "/portal/insights": "Insights",
};

export default function PortalHeader({ profile }: Props) {
  const pathname = usePathname();
  const title = Object.entries(TITLES).find(([key]) =>
    key === "/portal" ? pathname === key : pathname.startsWith(key)
  )?.[1] ?? "Portal";

  return (
    <header className="bg-white border-b border-gray-100 px-6 lg:px-8 py-4 flex items-center justify-between flex-shrink-0">
      <div>
        <h1 className="text-lg font-bold text-[#2D2F3A]">{title}</h1>
        {profile?.team && (
          <p className="text-xs text-gray-400 capitalize mt-0.5">
            Team: {profile.team.replace(/_/g, " ")}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2E7BC4] to-[#2EA87A] flex items-center justify-center text-white text-xs font-bold">
          {profile?.full_name?.charAt(0) ?? "?"}
        </div>
      </div>
    </header>
  );
}
