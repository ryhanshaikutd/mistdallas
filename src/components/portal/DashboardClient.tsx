"use client";

import Link from "next/link";
import type { Profile } from "@/lib/types";
import { TEAM_LABELS } from "@/lib/constants";
import {
  Users, ClipboardList, CheckSquare, Calendar,
  ArrowRight, Clock, AlertCircle, CheckCircle2,
} from "lucide-react";

interface Props {
  profile: Profile | null;
  recentApplications: {id: string; status: string; applicant_name?: string; created_at?: string}[];
  pendingTasks: {id: string; title: string; status: string; due_date?: string | null; priority: string}[];
  activeCycle: {type: string; year: number} | null;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-yellow-100 text-yellow-700",
  interview_scheduled: "bg-purple-100 text-purple-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  redirected_dream_team: "bg-orange-100 text-orange-700",
  offered_different_position: "bg-teal-100 text-teal-700",
};

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  interview_scheduled: "Interview Scheduled",
  accepted: "Accepted",
  rejected: "Rejected",
  redirected_dream_team: "Dream Team",
  offered_different_position: "Alt. Position Offered",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-gray-400",
  medium: "text-yellow-500",
  high: "text-red-500",
};

function greeting(name: string) {
  const h = new Date().getHours();
  const g = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${g}, ${name.split(" ")[0]}`;
}

export default function DashboardClient({ profile, recentApplications, pendingTasks, activeCycle }: Props) {
  const isReviewer = ["regional_director", "internal_ad", "external_ad"].includes(profile?.role ?? "");
  const isApplicant = profile?.role === "applicant";

  const quickLinks = [
    ...(isApplicant ? [{ href: "/portal/apply", label: "Submit Application", icon: ClipboardList, color: "from-[#1B3464] to-[#2E7BC4]" }] : []),
    ...(isReviewer ? [{ href: "/portal/review", label: "Review Applications", icon: Users, color: "from-[#1B3464] to-[#2E7BC4]" }] : []),
    ...(isReviewer ? [{ href: "/portal/interviews", label: "Manage Interviews", icon: Calendar, color: "from-[#2E7BC4] to-[#90C8EA]" }] : []),
    ...(!isApplicant ? [{ href: "/portal/planning", label: "Planning Board", icon: CheckSquare, color: "from-[#1A6B3C] to-[#2EA87A]" }] : []),
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold text-[#2D2F3A]">
          {greeting(profile?.full_name || "Board Member")} 👋
        </h2>
        <p className="text-gray-500 mt-1">
          {activeCycle
            ? `Recruitment cycle is ${activeCycle.type === "internal" ? "open internally" : "open to all"} for ${activeCycle.year}.`
            : "No active recruitment cycle right now."}
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickLinks.map((l) => {
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className="group flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${l.color} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[#2D2F3A] text-sm">{l.label}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#2E7BC4] transition-colors" />
            </Link>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Applications panel */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-[#2D2F3A] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#2E7BC4]" />
              {isReviewer ? "Recent Applications" : "My Application"}
            </h3>
            {isReviewer && (
              <Link href="/portal/review" className="text-xs text-[#2E7BC4] hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
          <div className="divide-y divide-gray-50">
            {recentApplications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                {isApplicant ? "You haven't applied yet." : "No applications yet."}
              </div>
            ) : (
              recentApplications.slice(0, 5).map((app) => (
                <div key={app.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-[#2D2F3A]">
                      {app.applicant_name ?? "Your application"}
                    </div>
                    {app.created_at && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {new Date(app.created_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[app.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABELS[app.status] ?? app.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tasks panel */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-[#2D2F3A] flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#2EA87A]" />
              Pending Tasks
              {profile?.team && (
                <span className="text-xs text-gray-400 font-normal">
                  ({TEAM_LABELS[profile.team]})
                </span>
              )}
            </h3>
            <Link href="/portal/planning" className="text-xs text-[#2E7BC4] hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingTasks.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                All caught up!
              </div>
            ) : (
              pendingTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${PRIORITY_COLORS[task.priority]}`} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#2D2F3A] truncate">{task.title}</div>
                      {task.due_date && (
                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          Due {new Date(task.due_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`ml-3 text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${
                    task.status === "in_progress" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {task.status === "in_progress" ? "In Progress" : "To Do"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
