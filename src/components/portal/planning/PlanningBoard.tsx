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
  low: { label: "Low", color: "text-gray-400", bg: "bg-gray-100" },
  medium: { label: "Medium", color: "text-yellow-600", bg: "bg-yellow-50" },
  high: { label: "High", color: "text-red-600", bg: "bg-red-50" },
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
      <div className={`bg-white border rounded-xl p-4 space-y-3 ${overdue ? "border-red-200" : "border-gray-100"}`}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-[#2D2F3A] leading-tight">{task.title}</p>
          <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        {task.description && <p className="text-xs text-gray-500 leading-relaxed">{task.description}</p>}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.bg} ${p.color}`}>
            {p.label}
          </span>
          <span className="text-xs text-gray-400 capitalize">{TEAM_LABELS[task.team]}</span>
        </div>
        {task.assignee && (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#2E7BC4] to-[#2EA87A] flex items-center justify-center text-white text-xs font-bold">
              {task.assignee.full_name.charAt(0)}
            </div>
            <span className="text-xs text-gray-500">{task.assignee.full_name}</span>
          </div>
        )}
        {task.due_date && (
          <div className={`flex items-center gap-1 text-xs ${overdue ? "text-red-500" : "text-gray-400"}`}>
            {overdue ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
            {format(parseISO(task.due_date), "MMM d")}
            {overdue && " — overdue"}
          </div>
        )}
        {/* Status cycle */}
        <div className="flex gap-1 pt-1 border-t border-gray-50">
          {STATUS_COLS.map((col) => {
            const Icon = col.icon;
            return (
              <button
                key={col.key}
                onClick={() => updateTaskStatus(task.id, col.key)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  task.status === col.key
                    ? "bg-[#EEF2F9] text-[#1B3464]"
                    : "text-gray-400 hover:bg-gray-50"
                }`}
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
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTeam === "all" ? "bg-[#1B3464] text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                All Teams
              </button>
              {visibleTeams.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTeam(t)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTeam === t ? "bg-[#1B3464] text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {TEAM_LABELS[t]}
                </button>
              ))}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-2 text-xs font-medium transition-colors ${view === "kanban" ? "bg-[#1B3464] text-white" : "text-gray-500"}`}
            >
              Kanban
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-2 text-xs font-medium transition-colors ${view === "list" ? "bg-[#1B3464] text-white" : "text-gray-500"}`}
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
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h3 className="font-bold text-[#2D2F3A]">New Task</h3>
          <input
            type="text"
            placeholder="Task title *"
            value={newTask.title}
            onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2E7BC4]"
          />
          <textarea
            placeholder="Description (optional)"
            value={newTask.description}
            onChange={(e) => setNewTask((p) => ({ ...p, description: e.target.value }))}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2E7BC4] resize-none"
          />
          <div className="grid sm:grid-cols-4 gap-3">
            <select
              value={newTask.team}
              onChange={(e) => setNewTask((p) => ({ ...p, team: e.target.value as Team }))}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#2E7BC4]"
            >
              {visibleTeams.map((t) => (
                <option key={t} value={t}>{TEAM_LABELS[t]}</option>
              ))}
            </select>
            <select
              value={newTask.assigned_to}
              onChange={(e) => setNewTask((p) => ({ ...p, assigned_to: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#2E7BC4]"
            >
              <option value="">Assign to…</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask((p) => ({ ...p, priority: e.target.value as "low" | "medium" | "high" }))}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#2E7BC4]"
            >
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </select>
            <input
              type="date"
              value={newTask.due_date}
              onChange={(e) => setNewTask((p) => ({ ...p, due_date: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#2E7BC4]"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAddTask(false)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">
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
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-bold text-[#2D2F3A] mb-4 flex items-center gap-2">
            <Flag className="w-4 h-4 text-[#2EA87A]" /> Milestones
          </h3>
          <div className="flex flex-wrap gap-3">
            {milestones.map((m) => {
              const past = m.target_date ? isPast(parseISO(m.target_date)) : false;
              return (
                <div
                  key={m.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${
                    past ? "border-gray-200 bg-gray-50 text-gray-400" : "border-[#2EA87A]/30 bg-green-50 text-[#1A6B3C]"
                  }`}
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
              <div key={col.key} className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Icon className={`w-4 h-4 ${col.color}`} />
                  <span className="font-semibold text-sm text-[#2D2F3A]">{col.label}</span>
                  <span className="ml-auto text-xs text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {colTasks.map((task) => <TaskCard key={task.id} task={task} />)}
                  {colTasks.length === 0 && (
                    <div className="text-center text-xs text-gray-400 py-6">Empty</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm">No tasks yet.</div>
            ) : (
              filteredTasks.map((task) => {
                const p = PRIORITY_CONFIG[task.priority];
                const overdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== "done";
                const StatusIcon = STATUS_COLS.find((c) => c.key === task.status)?.icon ?? Circle;
                const statusColor = STATUS_COLS.find((c) => c.key === task.status)?.color ?? "text-gray-400";
                return (
                  <div key={task.id} className={`flex items-center gap-4 px-5 py-3.5 ${overdue ? "bg-red-50/50" : ""}`}>
                    <StatusIcon className={`w-4 h-4 flex-shrink-0 ${statusColor}`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-[#2D2F3A]">{task.title}</span>
                      {task.assignee && <span className="text-xs text-gray-400 ml-2">→ {task.assignee.full_name}</span>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.bg} ${p.color}`}>{p.label}</span>
                    {task.due_date && (
                      <span className={`text-xs ${overdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
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
                            className={`p-1.5 rounded-lg transition-colors ${
                              task.status === col.key ? "bg-[#EEF2F9]" : "hover:bg-gray-100"
                            }`}
                          >
                            <Icon className={`w-3.5 h-3.5 ${col.color}`} />
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-400 transition-colors">
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
