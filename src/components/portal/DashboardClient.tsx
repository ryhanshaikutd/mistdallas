"use client";

import Link from "next/link";
import { useState } from "react";
import type { Profile } from "@/lib/types";
import { TEAM_LABELS } from "@/lib/constants";
import { Users, ClipboardList, CheckSquare, Calendar, ArrowRight, Clock, Circle, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay, isToday, parseISO } from "date-fns";

interface Task { id: string; title: string; status: string; due_date?: string | null; priority: string; team?: string }
interface App { id: string; status: string; applicant_name?: string; created_at?: string }
interface Milestone { id: string; title: string; target_date?: string | null }

interface Props {
  profile: Profile | null;
  recentApplications: App[];
  pendingTasks: Task[];
  milestones: Milestone[];
  activeCycle: { type: string; year: number } | null;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: "#3B82F6", under_review: "#F59E0B", interview_scheduled: "#8B5CF6",
  accepted: "#10B981", rejected: "#EF4444", redirected_dream_team: "#F97316",
};
const PRIORITY_DOT: Record<string, string> = { high: "#EF4444", medium: "#F59E0B", low: "#6B7280" };

function greeting(name: string) {
  const h = new Date().getHours();
  return `${h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"}, ${name}`;
}

function WeekView({ tasks, milestones }: { tasks: Task[]; milestones: Milestone[] }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  const weekStart = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const tasksForDay = (day: Date) => tasks.filter(t => t.due_date && isSameDay(parseISO(t.due_date), day));
  const milestonesForDay = (day: Date) => milestones.filter(m => m.target_date && isSameDay(parseISO(m.target_date), day));
  const selectedTasks = tasksForDay(selectedDay);
  const selectedMilestones = milestonesForDay(selectedDay);

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }}>
      {/* Week header */}
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--p-border)" }}>
        <h3 className="font-bold text-sm" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>
          {format(weekStart, "MMM d")} — {format(days[6], "MMM d, yyyy")}
        </h3>
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--p-muted)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--p-card-hover)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => { setWeekOffset(0); setSelectedDay(new Date()); }} className="px-3 py-1 rounded-lg text-xs font-medium transition-colors" style={{ color: "var(--p-accent)", background: "var(--p-accent)" + "15" }}>
            Today
          </button>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--p-muted)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--p-card-hover)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-7 border-b" style={{ borderColor: "var(--p-border)" }}>
        {days.map(day => {
          const dayTasks = tasksForDay(day);
          const dayMilestones = milestonesForDay(day);
          const total = dayTasks.length + dayMilestones.length;
          const selected = isSameDay(day, selectedDay);
          const today = isToday(day);

          return (
            <button key={day.toISOString()} onClick={() => setSelectedDay(day)}
              className="flex flex-col items-center py-3 px-1 transition-all duration-150 border-r last:border-r-0"
              style={{
                borderColor: "var(--p-border)",
                background: selected ? "var(--p-accent)" + "15" : "transparent",
              }}>
              <span className="text-xs font-medium mb-1.5" style={{ color: "var(--p-muted)" }}>
                {format(day, "EEE")}
              </span>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-2`}
                style={{
                  background: today ? "#1B3464" : selected ? "var(--p-accent)" + "20" : "transparent",
                  color: today ? "#ffffff" : selected ? "var(--p-accent)" : "var(--p-text)",
                  fontFamily: "var(--font-syne)",
                }}>
                {format(day, "d")}
              </div>
              {total > 0 ? (
                <div className="flex gap-0.5 flex-wrap justify-center">
                  {dayMilestones.slice(0, 2).map(m => (
                    <div key={m.id} className="w-1.5 h-1.5 rounded-full bg-[#2EA87A]" />
                  ))}
                  {dayTasks.slice(0, 3).map(t => (
                    <div key={t.id} className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_DOT[t.priority] ?? "#6B7280" }} />
                  ))}
                </div>
              ) : (
                <div className="w-1.5 h-1.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day content */}
      <div className="p-5">
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--p-muted)" }}>
          {format(selectedDay, "EEEE, MMMM d")}
        </p>
        {selectedTasks.length === 0 && selectedMilestones.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: "var(--p-muted)" }}>Nothing scheduled — enjoy the day.</p>
        ) : (
          <div className="space-y-2">
            {selectedMilestones.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "#2EA87A" + "15" }}>
                <div className="w-2 h-2 rounded-full bg-[#2EA87A] flex-shrink-0" />
                <span className="text-sm font-semibold" style={{ color: "#2EA87A" }}>{m.title}</span>
                <span className="text-xs ml-auto" style={{ color: "#2EA87A" + "80" }}>Milestone</span>
              </div>
            ))}
            {selectedTasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "var(--p-card-hover)" }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIORITY_DOT[t.priority] ?? "#6B7280" }} />
                <span className="text-sm flex-1 truncate" style={{ color: "var(--p-text)" }}>{t.title}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{
                  background: t.status === "in_progress" ? "#F59E0B20" : "var(--p-border)",
                  color: t.status === "in_progress" ? "#F59E0B" : "var(--p-muted)",
                }}>
                  {t.status === "in_progress" ? "In Progress" : "To Do"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardClient({ profile, recentApplications, pendingTasks, milestones, activeCycle }: Props) {
  const isReviewer = ["regional_director", "internal_ad", "external_ad"].includes(profile?.role ?? "");
  const isApplicant = profile?.role === "applicant";
  const displayName = profile?.preferred_name || profile?.full_name?.split(" ")[0] || "there";

  const quickLinks = [
    ...(isApplicant ? [{ href: "/portal/apply", label: "Submit Application", icon: ClipboardList, color: "#1B3464" }] : []),
    ...(isReviewer ? [{ href: "/portal/review", label: "Review Applications", icon: Users, color: "#2E7BC4" }] : []),
    ...(isReviewer ? [{ href: "/portal/interviews", label: "Manage Interviews", icon: Calendar, color: "#1A6B3C" }] : []),
    ...(!isApplicant ? [{ href: "/portal/planning", label: "Planning Board", icon: CheckSquare, color: "#2EA87A" }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6" style={{ animation: "fadeInUp 0.5s ease both" }}>
      {/* Greeting */}
      <div>
        <h2 className="text-3xl font-extrabold" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>
          {greeting(displayName)} 👋
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--p-muted)" }}>
          {activeCycle
            ? `Recruitment is ${activeCycle.type === "internal" ? "open internally" : "open to all"} · ${activeCycle.year}`
            : "No active recruitment cycle."}
        </p>
      </div>

      {/* Quick links */}
      {quickLinks.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickLinks.map(l => {
            const Icon = l.icon;
            return (
              <Link key={l.href} href={l.href}
                className="group flex items-center gap-3 rounded-2xl p-4 border transition-all duration-200"
                style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--p-accent)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--p-border)"}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: l.color + "20" }}>
                  <Icon className="w-4 h-4" style={{ color: l.color }} />
                </div>
                <span className="text-sm font-semibold flex-1" style={{ color: "var(--p-text)" }}>{l.label}</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--p-accent)" }} />
              </Link>
            );
          })}
        </div>
      )}

      {/* Week view */}
      <WeekView tasks={pendingTasks} milestones={milestones} />

      {/* Bottom panels */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Applications */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--p-border)" }}>
            <span className="font-bold text-sm" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>
              {isReviewer ? "Recent Applications" : "My Application"}
            </span>
            {isReviewer && (
              <Link href="/portal/review" className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--p-accent)" }}>
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
          <div className="divide-y" style={{ borderColor: "var(--p-border)" }}>
            {recentApplications.length === 0 ? (
              <div className="py-10 text-center">
                <AlertCircle className="w-7 h-7 mx-auto mb-2 opacity-30" style={{ color: "var(--p-muted)" }} />
                <p className="text-sm" style={{ color: "var(--p-muted)" }}>{isApplicant ? "You haven't applied yet." : "No applications yet."}</p>
              </div>
            ) : (
              recentApplications.slice(0, 5).map(app => (
                <div key={app.id} className="px-5 py-3 flex items-center justify-between" style={{ borderColor: "var(--p-border)" }}>
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--p-text)" }}>{app.applicant_name ?? "Your application"}</div>
                    {app.created_at && <div className="text-xs mt-0.5" style={{ color: "var(--p-muted)" }}>{new Date(app.created_at).toLocaleDateString()}</div>}
                  </div>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[app.status] ?? "#6B7280" }} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tasks */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--p-border)" }}>
            <span className="font-bold text-sm" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>
              Active Tasks {profile?.team && <span className="font-normal" style={{ color: "var(--p-muted)" }}>· {TEAM_LABELS[profile.team]}</span>}
            </span>
            <Link href="/portal/planning" className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--p-accent)" }}>
              Board <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--p-border)" }}>
            {pendingTasks.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="w-7 h-7 mx-auto mb-2 opacity-30" style={{ color: "var(--p-accent-green)" }} />
                <p className="text-sm" style={{ color: "var(--p-muted)" }}>All caught up!</p>
              </div>
            ) : (
              pendingTasks.slice(0, 5).map(task => (
                <div key={task.id} className="px-5 py-3 flex items-center gap-3" style={{ borderColor: "var(--p-border)" }}>
                  {task.status === "in_progress"
                    ? <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#F59E0B" }} />
                    : <Circle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--p-muted)" }} />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate" style={{ color: "var(--p-text)" }}>{task.title}</div>
                    {task.due_date && <div className="text-xs mt-0.5" style={{ color: "var(--p-muted)" }}>Due {new Date(task.due_date).toLocaleDateString()}</div>}
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: PRIORITY_DOT[task.priority] ?? "#6B7280" }} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
