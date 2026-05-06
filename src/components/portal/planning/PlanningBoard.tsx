"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Task, Milestone, Team } from "@/lib/types";
import { TEAM_LABELS, AD_TEAMS } from "@/lib/constants";
import {
  Plus, CheckCircle2, Circle, Clock, AlertCircle,
  ChevronDown, Calendar, Flag, Trash2, Edit3,
} from "lucide-react";
import { format, parseISO, isPast } from "date-fns";

interface Props {
  profile: Profile | null;
  tasks: (Task & { assignee?: { id: string; full_name: string; email: string } | null; assigner?: { id: string; full_name: string } | null })[];
  milestones: Milestone[];
  teamMembers: { id: string; full_name: string; role: string; team: string }[];
  isLeadership: boolean;
}

const PRIORITY_CONFIG = {
  low: { label: "Low", style: { background: "var(--p-card-hover)", color: "var(--p-muted)" } },
  medium: { label: "Medium", style: { background: "#F59E0B20", color: "#F59E0B" } },
  high: { label: "High", style: { background: "#EF444420", color: "#EF4444" } },
};

const STATUS_COLS = [
  { key: "todo", label: "To Do", icon: Circle, color: "text-gray-400" },
  { key: "in_progress", label: "In Progress", icon: Clock, color: "text-yellow-500" },
  { key: "done", label: "Done", icon: CheckCircle2, color: "text-green-500" },
] as const;

export default function PlanningBoard({ profile, tasks: initialTasks, milestones, teamMembers, isLeadership }: Props) {
  const supabase = createClient();
  const [tasks, setTasks] = useState(initialTasks);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showAddTask, setShowAddTask] = useState(false);
  const [activeTeam, setActiveTeam] = useState<Team | "all">(
    isLeadership ? "all" : (profile?.team ?? "all") as Team | "all"
  );

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assigned_to: "",
    due_date: "",
    priority: "medium" as "low" | "medium" | "high",
    team: profile?.team ?? "logistics" as Team,
  });
  const [saving, setSaving] = useState(false);

  // Determine which teams this user can see
  const visibleTeams: Team[] =
    profile?.role === "regional_director"
      ? Object.keys(TEAM_LABELS) as Team[]
      : profile?.role === "internal_ad"
      ? AD_TEAMS.internal_ad
      : profile?.role === "external_ad"
      ? AD_TEAMS.external_ad
      : profile?.team
      ? [profile.team as Team]
      : [];

  const filteredTasks = tasks.filter((t) =>
    activeTeam === "all" ? true : t.team === activeTeam
  );

  async function addTask() {
    if (!newTask.title.trim() || !profile) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: newTask.title.trim(),
        description: newTask.description || null,
        team: newTask.team,
        assigned_to: newTask.assigned_to || null,
        assigned_by: profile.id,
        due_date: newTask.due_date || null,
        priority: newTask.priority,
        status: "todo",
      })
      .select("*, assignee:profiles!tasks_assigned_to_fkey(id, full_name, email), assigner:profiles!tasks_assigned_by_fkey(id, full_name)")
      .single();

    if (error) {
      toast.error("Failed to create task.");
    } else {
      setTasks((prev) => [data, ...prev]);
      setNewTask({ title: "", description: "", assigned_to: "", due_date: "", priority: "medium", team: profile.team ?? "logistics" as Team });
      setShowAddTask(false);
      toast.success("Task created.");
    }
    setSaving(false);
  }

  async function updateTaskStatus(id: string, status: "todo" | "in_progress" | "done") {
    const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
    if (error) { toast.error("Failed to update."); return; }
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
  }

  async function deleteTask(id: string) {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { toast.error("Failed to delete."); return; }
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast.success("Task deleted.");
  }

  const TaskCard = ({ task }: { task: typeof tasks[0] }) => {
    const overdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== "done";
    const p = PRIORITY_CONFIG[task.priority];
    return (
      <div style={{ background: "var(--p-card)", borderColor: overdue ? "#fca5a5" : "var(--p-border)" }} className="border rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p style={{ color: "var(--p-text)" }} className="text-sm font-semibold leading-tight">{task.title}</p>
          <button onClick={() => deleteTask(task.id)} style={{ color: "var(--p-muted)" }} className="hover:text-red-400 transition-colors flex-shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        {task.description && <p style={{ color: "var(--p-text-secondary)" }} className="text-xs leading-relaxed">{task.description}</p>}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={p.style}>
            {p.label}
          </span>
          <span style={{ color: "var(--p-muted)" }} className="text-xs capitalize">{TEAM_LABELS[task.team]}</span>
        </div>
        {task.assignee && (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#2E7BC4] to-[#2EA87A] flex items-center justify-center text-white text-xs font-bold">
              {task.assignee.full_name.charAt(0)}
            </div>
            <span style={{ color: "var(--p-text-secondary)" }} className="text-xs">{task.assignee.full_name}</span>
          </div>
        )}
        {task.due_date && (
          <div className={`flex items-center gap-1 text-xs ${overdue ? "text-red-500" : ""}`} style={overdue ? {} : { color: "var(--p-muted)" }}>
            {overdue ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
            {format(parseISO(task.due_date), "MMM d")}
            {overdue && " — overdue"}
          </div>
        )}
        {/* Status cycle */}
        <div style={{ borderColor: "var(--p-border)" }} className="flex gap-1 pt-1 border-t">
          {STATUS_COLS.map((col) => {
            const Icon = col.icon;
            return (
              <button
                key={col.key}
                onClick={() => updateTaskStatus(task.id, col.key)}
                style={task.status === col.key
                  ? { background: "var(--p-accent)" + "20", color: "var(--p-accent)" }
                  : { color: "var(--p-muted)" }}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              >
                <Icon className={`w-3 h-3 ${col.color}`} />
                <span className="hidden sm:block">{col.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Team tabs */}
          {visibleTeams.length > 1 && (
            <>
              <button
                onClick={() => setActiveTeam("all")}
                style={activeTeam === "all"
                  ? { background: "#1B3464", color: "#fff" }
                  : { background: "var(--p-card)", borderColor: "var(--p-border)", color: "var(--p-text-secondary)" }}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all border"
              >
                All Teams
              </button>
              {visibleTeams.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTeam(t)}
                  style={activeTeam === t
                    ? { background: "#1B3464", color: "#fff" }
                    : { background: "var(--p-card)", borderColor: "var(--p-border)", color: "var(--p-text-secondary)" }}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all border"
                >
                  {TEAM_LABELS[t]}
                </button>
              ))}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }} className="flex border rounded-xl overflow-hidden">
            <button
              onClick={() => setView("kanban")}
              style={view === "kanban" ? { background: "#1B3464", color: "#fff" } : { color: "var(--p-text-secondary)" }}
              className="px-3 py-2 text-xs font-medium transition-colors"
            >
              Kanban
            </button>
            <button
              onClick={() => setView("list")}
              style={view === "list" ? { background: "#1B3464", color: "#fff" } : { color: "var(--p-text-secondary)" }}
              className="px-3 py-2 text-xs font-medium transition-colors"
            >
              List
            </button>
          </div>
          <button
            onClick={() => setShowAddTask(true)}
            className="flex items-center gap-2 bg-[#1B3464] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#2E7BC4] transition-colors"
          >
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </div>

      {/* Add task form */}
      {showAddTask && (
        <div style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }} className="rounded-2xl border p-6 space-y-4">
          <h3 style={{ color: "var(--p-text)", fontFamily: "var(--font-syne)" }} className="font-bold">New Task</h3>
          <input
            type="text"
            placeholder="Task title *"
            value={newTask.title}
            onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
            style={{ borderColor: "var(--p-border)", color: "var(--p-text)", background: "var(--p-card)" }}
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none"
          />
          <textarea
            placeholder="Description (optional)"
            value={newTask.description}
            onChange={(e) => setNewTask((p) => ({ ...p, description: e.target.value }))}
            rows={2}
            style={{ borderColor: "var(--p-border)", color: "var(--p-text)", background: "var(--p-card)" }}
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none resize-none"
          />
          <div className="grid sm:grid-cols-4 gap-3">
            <select
              value={newTask.team}
              onChange={(e) => setNewTask((p) => ({ ...p, team: e.target.value as Team }))}
              style={{ borderColor: "var(--p-border)", color: "var(--p-text)", background: "var(--p-card)" }}
              className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
            >
              {visibleTeams.map((t) => (
                <option key={t} value={t}>{TEAM_LABELS[t]}</option>
              ))}
            </select>
            <select
              value={newTask.assigned_to}
              onChange={(e) => setNewTask((p) => ({ ...p, assigned_to: e.target.value }))}
              style={{ borderColor: "var(--p-border)", color: "var(--p-text)", background: "var(--p-card)" }}
              className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
            >
              <option value="">Assign to…</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask((p) => ({ ...p, priority: e.target.value as "low" | "medium" | "high" }))}
              style={{ borderColor: "var(--p-border)", color: "var(--p-text)", background: "var(--p-card)" }}
              className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
            >
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </select>
            <input
              type="date"
              value={newTask.due_date}
              onChange={(e) => setNewTask((p) => ({ ...p, due_date: e.target.value }))}
              style={{ borderColor: "var(--p-border)", color: "var(--p-text)", background: "var(--p-card)" }}
              className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAddTask(false)} style={{ borderColor: "var(--p-border)", color: "var(--p-text-secondary)" }} className="px-5 py-2.5 border rounded-xl text-sm">
              Cancel
            </button>
            <button
              onClick={addTask}
              disabled={saving || !newTask.title.trim()}
              className="px-6 py-2.5 bg-[#1B3464] text-white text-sm font-semibold rounded-xl hover:bg-[#2E7BC4] transition-colors disabled:opacity-40"
            >
              {saving ? "Creating…" : "Create Task"}
            </button>
          </div>
        </div>
      )}

      {/* Milestones */}
      {milestones.length > 0 && (
        <div className="rounded-2xl border p-5" style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }}>
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: "var(--p-text)", fontFamily: "var(--font-syne)" }}>
            <Flag className="w-4 h-4" style={{ color: "#2EA87A" }} /> Milestones
          </h3>
          <div className="flex flex-wrap gap-3">
            {milestones.map((m) => {
              const past = m.target_date ? isPast(parseISO(m.target_date)) : false;
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm"
                  style={past
                    ? { borderColor: "var(--p-border)", background: "var(--p-card-hover)", color: "var(--p-muted)" }
                    : { borderColor: "#2EA87A50", background: "#2EA87A15", color: "#2EA87A" }}
                >
                  <Flag className="w-3 h-3" />
                  <span className="font-medium">{m.title}</span>
                  {m.target_date && (
                    <span className="text-xs opacity-70">
                      {format(parseISO(m.target_date), "MMM d")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Kanban view */}
      {view === "kanban" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STATUS_COLS.map((col) => {
            const Icon = col.icon;
            const colTasks = filteredTasks.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="rounded-2xl p-4" style={{ background: "var(--p-card-hover)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Icon className={`w-4 h-4 ${col.color}`} />
                  <span className="font-semibold text-sm" style={{ color: "var(--p-text)" }}>{col.label}</span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full border" style={{ color: "var(--p-muted)", background: "var(--p-card)", borderColor: "var(--p-border)" }}>
                    {colTasks.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {colTasks.map((task) => <TaskCard key={task.id} task={task} />)}
                  {colTasks.length === 0 && (
                    <div className="text-center text-xs py-6" style={{ color: "var(--p-muted)" }}>Empty</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }}>
          <div className="divide-y" style={{ borderColor: "var(--p-border)" }}>
            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center text-sm" style={{ color: "var(--p-muted)" }}>No tasks yet.</div>
            ) : (
              filteredTasks.map((task) => {
                const p = PRIORITY_CONFIG[task.priority];
                const overdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== "done";
                const StatusIcon = STATUS_COLS.find((c) => c.key === task.status)?.icon ?? Circle;
                const statusColor = STATUS_COLS.find((c) => c.key === task.status)?.color ?? "text-gray-400";
                return (
                  <div key={task.id} className="flex items-center gap-4 px-5 py-3.5"
                    style={overdue ? { background: "#EF444408" } : {}}>
                    <StatusIcon className={`w-4 h-4 flex-shrink-0 ${statusColor}`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium" style={{ color: "var(--p-text)" }}>{task.title}</span>
                      {task.assignee && <span className="text-xs ml-2" style={{ color: "var(--p-muted)" }}>→ {task.assignee.full_name}</span>}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={p.style}>{p.label}</span>
                    {task.due_date && (
                      <span className="text-xs" style={overdue ? { color: "#EF4444", fontWeight: 500 } : { color: "var(--p-muted)" }}>
                        {format(parseISO(task.due_date), "MMM d")}
                      </span>
                    )}
                    <div className="flex gap-1">
                      {STATUS_COLS.map((col) => {
                        const Icon = col.icon;
                        return (
                          <button
                            key={col.key}
                            onClick={() => updateTaskStatus(task.id, col.key)}
                            title={col.label}
                            className="p-1.5 rounded-lg transition-colors"
                            style={task.status === col.key
                              ? { background: "var(--p-accent)" + "20" }
                              : { background: "transparent" }}
                            onMouseEnter={e => { if (task.status !== col.key) (e.currentTarget as HTMLElement).style.background = "var(--p-card-hover)"; }}
                            onMouseLeave={e => { if (task.status !== col.key) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                          >
                            <Icon className={`w-3.5 h-3.5 ${col.color}`} />
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="transition-colors"
                      style={{ color: "var(--p-muted)" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#EF4444"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--p-muted)"}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
