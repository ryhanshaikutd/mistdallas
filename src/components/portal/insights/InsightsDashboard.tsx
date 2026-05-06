"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { TEAM_LABELS } from "@/lib/constants";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Upload, Users, CheckSquare, CalendarDays, BarChart3, TrendingUp } from "lucide-react";
import Papa from "papaparse";

interface Props {
  profile: Profile | null;
  applications: {
    id: string; status: string; gender: string; is_internal: boolean;
    created_at: string;
    application_rankings?: { position?: { team: string } | null }[];
  }[];
  tasks: { id: string; status: string; team: string }[];
  attendance: { id: string; event_name: string; event_date: string; school?: string | null; team?: string | null; cycle_year: number }[];
  isLeadership: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: "#60A5FA",
  under_review: "#FBBF24",
  interview_scheduled: "#A78BFA",
  accepted: "#34D399",
  rejected: "#F87171",
  redirected_dream_team: "#FB923C",
  offered_different_position: "#2DD4BF",
};

const CHART_COLORS = ["#1B3464", "#2E7BC4", "#90C8EA", "#1A6B3C", "#2EA87A", "#7ADBB8"];

export default function InsightsDashboard({ profile, applications, tasks, attendance: initialAttendance, isLeadership }: Props) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [attendance, setAttendance] = useState(initialAttendance);
  const [uploading, setUploading] = useState(false);

  // ── Application stats ──
  const statusData = Object.entries(
    applications.reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: name.replace(/_/g, " "), value, key: name }));

  const genderData = [
    { name: "Brothers", value: applications.filter((a) => a.gender === "brother").length },
    { name: "Sisters", value: applications.filter((a) => a.gender === "sister").length },
  ];

  const internalData = [
    { name: "Internal", value: applications.filter((a) => a.is_internal).length },
    { name: "External", value: applications.filter((a) => !a.is_internal).length },
  ];

  // Role fill by team
  const byTeam = Object.entries(TEAM_LABELS).map(([team, label]) => ({
    team: label,
    applied: applications.filter((a) =>
      a.application_rankings?.some((r) => r.position?.team === team)
    ).length,
    accepted: applications.filter((a) =>
      a.status === "accepted" && a.application_rankings?.some((r) => r.position?.team === team)
    ).length,
  }));

  // ── Task stats ──
  const teamTaskData = Object.entries(TEAM_LABELS).map(([team, label]) => {
    const teamTasks = tasks.filter((t) => t.team === team);
    return {
      team: label,
      done: teamTasks.filter((t) => t.status === "done").length,
      inProgress: teamTasks.filter((t) => t.status === "in_progress").length,
      todo: teamTasks.filter((t) => t.status === "todo").length,
      total: teamTasks.length,
    };
  }).filter((d) => d.total > 0);

  const overallTaskRate = tasks.length
    ? Math.round((tasks.filter((t) => t.status === "done").length / tasks.length) * 100)
    : 0;

  // ── Attendance stats ──
  const attendanceByEvent = Object.entries(
    attendance.reduce<Record<string, number>>((acc, r) => {
      acc[r.event_name] = (acc[r.event_name] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  async function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[];
        const records = rows.map((row) => ({
          event_name: row["Event Name"] ?? row["event_name"] ?? "Unknown Event",
          event_date: row["Event Date"] ?? row["event_date"] ?? new Date().toISOString().slice(0, 10),
          attendee_name: row["Name"] ?? row["attendee_name"] ?? row["Attendee"] ?? "",
          attendee_email: row["Email"] ?? row["email"] ?? null,
          school: row["School"] ?? row["school"] ?? null,
          category: row["Category"] ?? row["category"] ?? null,
          cycle_year: new Date().getFullYear(),
        })).filter((r) => r.attendee_name);

        if (records.length === 0) {
          toast.error("No valid records found. Check your CSV columns.");
          setUploading(false);
          return;
        }

        const { data, error } = await supabase
          .from("attendance_records")
          .insert(records)
          .select();

        if (error) {
          toast.error("Upload failed: " + error.message);
        } else {
          setAttendance((prev) => [...prev, ...(data ?? [])]);
          toast.success(`Uploaded ${data?.length ?? 0} attendance records.`);
        }
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      },
      error: () => {
        toast.error("Failed to parse CSV.");
        setUploading(false);
      },
    });
  }

  const StatCard = ({ icon: Icon, label, value, sub, color }: {
    icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
  }) => (
    <div className="rounded-2xl border p-5" style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: color }}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="text-2xl font-bold" style={{ color: "var(--p-text)", fontFamily: "var(--font-syne)" }}>{value}</div>
      <div className="text-sm mt-0.5" style={{ color: "var(--p-text-secondary)" }}>{label}</div>
      {sub && <div className="text-xs mt-1" style={{ color: "var(--p-muted)" }}>{sub}</div>}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Applications" value={applications.length} color="bg-[#1B3464]" />
        <StatCard icon={TrendingUp} label="Accepted" value={applications.filter((a) => a.status === "accepted").length} color="bg-[#1A6B3C]" />
        <StatCard icon={CheckSquare} label="Task Completion" value={`${overallTaskRate}%`} sub={`${tasks.filter((t) => t.status === "done").length} of ${tasks.length} done`} color="bg-[#2E7BC4]" />
        <StatCard icon={CalendarDays} label="Event Records" value={attendance.length} sub={`${new Set(attendance.map((a) => a.event_name)).size} events`} color="bg-[#2EA87A]" />
      </div>

      {isLeadership && (
        <>
          {/* Application status breakdown */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border p-6" style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }}>
              <h3 className="font-bold mb-5 flex items-center gap-2" style={{ color: "var(--p-text)", fontFamily: "var(--font-syne)" }}>
                <BarChart3 className="w-4 h-4" style={{ color: "#2E7BC4" }} /> Applications by Team
              </h3>
              {byTeam.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byTeam} margin={{ left: -20 }}>
                    <XAxis dataKey="team" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="applied" name="Applied" fill="#2E7BC4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="accepted" name="Accepted" fill="#2EA87A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-sm" style={{ color: "var(--p-muted)" }}>No application data yet.</div>
              )}
            </div>

            <div className="space-y-4">
              {/* Gender breakdown */}
              <div className="rounded-2xl border p-5" style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }}>
                <h4 className="font-bold mb-4 text-sm" style={{ color: "var(--p-text)", fontFamily: "var(--font-syne)" }}>Gender Split</h4>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={genderData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" label={false} labelLine={false} fontSize={10}>
                      {genderData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Internal/External */}
              <div className="rounded-2xl border p-5" style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }}>
                <h4 className="font-bold mb-4 text-sm" style={{ color: "var(--p-text)", fontFamily: "var(--font-syne)" }}>Internal vs External</h4>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={internalData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" label={false} labelLine={false} fontSize={10}>
                      {internalData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i + 2]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Status distribution */}
          <div className="rounded-2xl border p-6" style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }}>
            <h3 className="font-bold mb-5" style={{ color: "var(--p-text)", fontFamily: "var(--font-syne)" }}>Application Status Breakdown</h3>
            <div className="flex flex-wrap gap-3">
              {statusData.map((s) => (
                <div key={s.key} className="flex items-center gap-2 px-4 py-2 rounded-xl border" style={{ borderColor: "var(--p-border)" }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: STATUS_COLORS[s.key] ?? "#9CA3AF" }} />
                  <span className="text-sm font-medium capitalize" style={{ color: "var(--p-text)" }}>{s.name}</span>
                  <span className="text-sm" style={{ color: "var(--p-muted)" }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Task completion by team */}
      {teamTaskData.length > 0 && (
        <div className="rounded-2xl border p-6" style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }}>
          <h3 className="font-bold mb-5 flex items-center gap-2" style={{ color: "var(--p-text)", fontFamily: "var(--font-syne)" }}>
            <CheckSquare className="w-4 h-4" style={{ color: "#2EA87A" }} /> Task Completion by Team
          </h3>
          <div className="space-y-3">
            {teamTaskData.map((d) => {
              const rate = d.total > 0 ? Math.round((d.done / d.total) * 100) : 0;
              return (
                <div key={d.team} className="flex items-center gap-4">
                  <div className="w-28 text-sm flex-shrink-0" style={{ color: "var(--p-text-secondary)" }}>{d.team}</div>
                  <div className="flex-1 rounded-full h-3 overflow-hidden" style={{ background: "var(--p-card-hover)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${rate}%`, background: "linear-gradient(90deg, #2E7BC4, #2EA87A)" }}
                    />
                  </div>
                  <div className="w-12 text-right text-sm font-semibold" style={{ color: "var(--p-text)" }}>{rate}%</div>
                  <div className="text-xs w-16 text-right" style={{ color: "var(--p-muted)" }}>{d.done}/{d.total} done</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Attendance */}
      <div className="rounded-2xl border p-6 space-y-5" style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2" style={{ color: "var(--p-text)", fontFamily: "var(--font-syne)" }}>
            <CalendarDays className="w-4 h-4" style={{ color: "#2EA87A" }} /> Event Attendance
          </h3>
          <label
            className="flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer text-sm font-medium transition-all"
            style={uploading
              ? { opacity: 0.5, cursor: "wait", borderColor: "var(--p-border)", color: "var(--p-muted)" }
              : { borderColor: "#1B3464", color: "#1B3464" }}
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading…" : "Upload CSV"}
            <input ref={fileRef} type="file" accept=".csv" onChange={handleCSVUpload} className="sr-only" />
          </label>
        </div>

        <p className="text-xs" style={{ color: "var(--p-muted)" }}>
          Export from MyMIST and upload. Required columns: Event Name, Event Date, Name, School (optional), Email (optional).
        </p>

        {attendanceByEvent.length === 0 ? (
          <div className="py-10 text-center text-sm" style={{ color: "var(--p-muted)" }}>
            No attendance data yet. Upload a CSV from MyMIST to get started.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={attendanceByEvent} margin={{ left: -20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="Attendees" fill="#2E7BC4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
