"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Download, ExternalLink, Plus, Pencil, Trash2, Bell, BellOff } from "lucide-react";
import type { Milestone, Priority, Team } from "@/lib/types";
import type { PhaseId } from "@/lib/workbook/types";
import { PHASE_IDS, PHASE_LABELS, PRIORITY_COLORS, TEAM_LABELS, TEAM_ORDER, phaseIdFromEnum } from "@/lib/constants";
import { PHASE_META } from "@/lib/workbook/content";
import { buildIcsCalendar, deadlineTiming, googleCalendarUrl } from "@/lib/deadlines";
import { downloadText, slugifyFilename } from "@/lib/download";
import { upsertMilestone, deleteMilestone, type MilestoneInput } from "@/app/portal/calendar/actions";

interface Props {
  milestones: Milestone[];
  canManage: boolean;
  reminder: { email_enabled: boolean; days_before: number } | null;
  todayIso: string;
  portalUrl: string;
}

const card = { background: "var(--p-card)", borderColor: "var(--p-border)", boxShadow: "var(--p-shadow)" } as const;
const input = { background: "var(--p-card)", borderColor: "var(--p-border)", color: "var(--p-text)" } as const;
const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];

const emptyForm = (): MilestoneInput => ({
  title: "", description: "", target_date: "", phase: null, priority: "medium", deadline_type: "Deadline",
  owner_label: "All Teams", send_reminders: true, date_label: null, team: null,
});

function toForm(m: Milestone): MilestoneInput {
  return {
    id: m.id, title: m.title, description: m.description ?? "", target_date: m.target_date ?? "",
    phase: m.phase ? phaseIdFromEnum(m.phase) : null, priority: m.priority, deadline_type: m.deadline_type,
    owner_label: m.owner_label, send_reminders: m.send_reminders, date_label: m.date_label, team: m.team,
  };
}

export default function CalendarClient({ milestones, canManage, reminder, todayIso, portalUrl }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<MilestoneInput | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const dated = milestones.filter((m) => m.target_date);
  const groups: { key: string; label: string; dates: string; color: string; items: Milestone[] }[] = PHASE_IDS.map((p) => ({
    key: p, label: PHASE_META[p].label, dates: PHASE_META[p].dates, color: PHASE_META[p].color,
    items: dated.filter((m) => m.phase && phaseIdFromEnum(m.phase) === p),
  }));
  const other = dated.filter((m) => !m.phase);
  if (other.length) groups.push({ key: "other", label: "Other dates", dates: "", color: "#64748B", items: other });
  const undated = milestones.filter((m) => !m.target_date);

  function save() {
    if (!form) return;
    startTransition(async () => {
      const result = await upsertMilestone(form);
      if (result.success) {
        toast.success(form.id ? "Deadline updated." : "Deadline added.");
        setForm(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteMilestone(id);
      if (result.success) {
        toast.success("Deadline deleted.");
        setConfirmDelete(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const downloadAll = () => downloadText("mist-dallas-2027-deadlines.ics", buildIcsCalendar(dated, { portalUrl, now: new Date() }), "text/calendar;charset=utf-8");
  const downloadOne = (m: Milestone) => downloadText(`${slugifyFilename(m.title)}.ics`, buildIcsCalendar([m], { portalUrl, now: new Date() }), "text/calendar;charset=utf-8");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl border p-5 flex flex-wrap items-center justify-between gap-4" style={card}>
        <div>
          <h2 className="font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>Calendar &amp; deadlines</h2>
          <p className="text-sm mt-1" style={{ color: "var(--p-muted)" }}>
            {dated.length} dated deadline{dated.length === 1 ? "" : "s"} · the .ics file works with Apple Calendar, Google Calendar and Outlook.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/portal/settings" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium"
            style={{ borderColor: "var(--p-border)", color: "var(--p-text-secondary)" }}>
            {reminder?.email_enabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            {reminder?.email_enabled ? `Reminders: ${reminder.days_before} day${reminder.days_before === 1 ? "" : "s"} before` : "Reminders: off"}
          </Link>
          <button onClick={downloadAll} disabled={dated.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-40" style={{ background: "#1B3464" }}>
            <Download className="w-3.5 h-3.5" /> Download all (.ics)
          </button>
          {canManage && (
            <button onClick={() => setForm(emptyForm())}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: "var(--p-accent)" }}>
              <Plus className="w-3.5 h-3.5" /> New deadline
            </button>
          )}
        </div>
      </div>

      {/* Leadership form */}
      {canManage && form && (
        <div className="rounded-2xl border p-5 space-y-3" style={card}>
          <h3 className="font-bold text-sm" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>{form.id ? "Edit deadline" : "New deadline"}</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title *" aria-label="Title"
              className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none sm:col-span-2" style={input} />
            <input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} aria-label="Date"
              className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={input} />
            <input value={form.date_label ?? ""} onChange={(e) => setForm({ ...form, date_label: e.target.value || null })} placeholder="Date label (e.g. Event Week)" aria-label="Date label"
              className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={input} />
            <select value={form.phase ?? ""} onChange={(e) => setForm({ ...form, phase: (e.target.value || null) as PhaseId | null })} aria-label="Phase"
              className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={input}>
              <option value="">No phase</option>
              {PHASE_IDS.map((p) => <option key={p} value={p}>{PHASE_LABELS[p]}</option>)}
            </select>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })} aria-label="Priority"
              className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none capitalize" style={input}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input value={form.deadline_type} onChange={(e) => setForm({ ...form, deadline_type: e.target.value })} placeholder="Type (Deadline, Check-in, …)" aria-label="Type"
              className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={input} />
            <input value={form.owner_label} onChange={(e) => setForm({ ...form, owner_label: e.target.value })} placeholder="Owner (All Teams, Finance Lead, …)" aria-label="Owner"
              className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={input} />
            <select value={form.team ?? ""} onChange={(e) => setForm({ ...form, team: (e.target.value || null) as Team | null })} aria-label="Team"
              className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={input}>
              <option value="">Every team</option>
              {TEAM_ORDER.map((t) => <option key={t} value={t}>{TEAM_LABELS[t]}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--p-text-secondary)" }}>
              <input type="checkbox" checked={form.send_reminders} onChange={(e) => setForm({ ...form, send_reminders: e.target.checked })} className="accent-[#2E7BC4]" />
              Send reminder emails
            </label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Details" aria-label="Details" rows={2}
              className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none sm:col-span-2" style={input} />
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={pending} className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: "#1B3464" }}>
              {pending ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setForm(null)} className="px-4 py-2 rounded-xl text-sm border" style={{ borderColor: "var(--p-border)", color: "var(--p-muted)" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Phase groups */}
      {groups.map((g) => (
        <section key={g.key} className="rounded-2xl border overflow-hidden" style={{ ...card, borderTop: `4px solid ${g.color}` }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--p-border)" }}>
            <div>
              <h3 className="font-bold text-sm" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>{g.label}</h3>
              {g.dates && <p className="text-xs" style={{ color: "var(--p-muted)" }}>{g.dates}</p>}
            </div>
            <span className="text-xs" style={{ color: "var(--p-muted)" }}>{g.items.length} deadline{g.items.length === 1 ? "" : "s"}</span>
          </div>
          {g.items.length === 0 ? (
            <p className="px-5 py-6 text-sm text-center" style={{ color: "var(--p-muted)" }}>No deadlines in this phase.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-px" style={{ background: "var(--p-border)" }}>
              {g.items.map((m) => {
                const timing = deadlineTiming(m.target_date, todayIso);
                const gcal = googleCalendarUrl(m, portalUrl);
                return (
                  <article key={m.id} className="p-5 space-y-2" style={{ background: "var(--p-card)", opacity: timing.isOverdue ? 0.75 : 1 }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold" style={{ color: g.color }}>{m.date_label ?? (m.target_date && format(parseISO(m.target_date), "MMM d"))}</div>
                        <h4 className="font-semibold text-sm mt-0.5" style={{ color: "var(--p-text)" }}>{m.title}</h4>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: timing.isOverdue ? "#EF444420" : "var(--p-card-hover)", color: timing.isOverdue ? "#EF4444" : "var(--p-muted)" }}>{timing.label}</span>
                    </div>
                    {m.description && <p className="text-xs" style={{ color: "var(--p-text-secondary)" }}>{m.description}</p>}
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <span className="px-2 py-0.5 rounded-full capitalize" style={{ background: PRIORITY_COLORS[m.priority] + "22", color: PRIORITY_COLORS[m.priority] }}>{m.priority}</span>
                      <span className="px-2 py-0.5 rounded-full" style={{ background: "var(--p-card-hover)", color: "var(--p-muted)" }}>{m.deadline_type}</span>
                      <span className="px-2 py-0.5 rounded-full" style={{ background: "var(--p-card-hover)", color: "var(--p-muted)" }}>{m.owner_label}</span>
                      {!m.send_reminders && <span className="px-2 py-0.5 rounded-full" style={{ background: "var(--p-card-hover)", color: "var(--p-muted)" }}>No reminders</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-medium">
                      <button onClick={() => downloadOne(m)} className="inline-flex items-center gap-1" style={{ color: "var(--p-accent)" }}><Download className="w-3.5 h-3.5" /> .ics</button>
                      {gcal && <a href={gcal} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1" style={{ color: "var(--p-accent)" }}><ExternalLink className="w-3.5 h-3.5" /> Google Calendar</a>}
                      {canManage && (
                        <>
                          <button onClick={() => setForm(toForm(m))} className="inline-flex items-center gap-1" style={{ color: "var(--p-text-secondary)" }}><Pencil className="w-3.5 h-3.5" /> Edit</button>
                          {confirmDelete === m.id ? (
                            <span className="inline-flex items-center gap-2">
                              <button onClick={() => remove(m.id)} disabled={pending} className="text-red-500 font-semibold">Confirm delete</button>
                              <button onClick={() => setConfirmDelete(null)} style={{ color: "var(--p-muted)" }}>Keep</button>
                            </span>
                          ) : (
                            <button onClick={() => setConfirmDelete(m.id)} className="inline-flex items-center gap-1" style={{ color: "var(--p-muted)" }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                          )}
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ))}

      {undated.length > 0 && (
        <section className="rounded-2xl border overflow-hidden" style={card}>
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--p-border)" }}>
            <h3 className="font-bold text-sm" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>Unscheduled</h3>
            <p className="text-xs" style={{ color: "var(--p-muted)" }}>Recurring milestones without a date this season.</p>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--p-border)" }}>
            {undated.map((m) => (
              <div key={m.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <span className="text-sm" style={{ color: "var(--p-text)" }}>{m.title}</span>
                {canManage && <button onClick={() => setForm(toForm(m))} className="text-xs font-medium" style={{ color: "var(--p-accent)" }}>Set a date</button>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
