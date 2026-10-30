"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Download, Plus, Trash2, MessageSquare, Gavel } from "lucide-react";
import { DECISION_CATEGORIES, type Decision, type DecisionCategory, type MeetingNote, type Team, type UserRole } from "@/lib/types";
import { TEAM_LABELS, TEAM_ORDER, isLeadership } from "@/lib/constants";
import { canWriteTeam } from "@/lib/permissions";
import { MEETING_TEMPLATES } from "@/lib/content/meeting-templates";
import { toCsv } from "@/lib/csv";
import { downloadText } from "@/lib/download";
import { createMeetingNote, deleteMeetingNote, createDecision, deleteDecision, type MeetingNoteInput, type DecisionInput } from "@/app/portal/meetings/actions";

interface Props {
  notes: MeetingNote[];
  decisions: Decision[];
  viewer: { role: UserRole; team: Team | null };
  todayIso: string;
}

const card = { background: "var(--p-card)", borderColor: "var(--p-border)", boxShadow: "var(--p-shadow)" } as const;
const input = { background: "var(--p-card)", borderColor: "var(--p-border)", color: "var(--p-text)" } as const;

function TeamSelect({ value, onChange, teams }: { value: Team | null; onChange: (t: Team | null) => void; teams: (Team | null)[] }) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange((e.target.value || null) as Team | null)} aria-label="Team"
      className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={input} disabled={teams.length === 1}>
      {teams.map((t) => <option key={t ?? "all"} value={t ?? ""}>{t ? TEAM_LABELS[t] : "All teams"}</option>)}
    </select>
  );
}

export default function MeetingsClient({ notes, decisions, viewer, todayIso }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const leader = isLeadership(viewer.role);
  const writableTeams: (Team | null)[] = leader ? [null, ...TEAM_ORDER] : viewer.team && canWriteTeam(viewer, viewer.team) ? [viewer.team] : [];
  const canWrite = writableTeams.length > 0;
  const defaultTeam = leader ? viewer.team : writableTeams[0] ?? null;

  const [noteForm, setNoteForm] = useState<MeetingNoteInput | null>(null);
  const [decisionForm, setDecisionForm] = useState<DecisionInput | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function run(work: () => Promise<{ success: boolean; error?: string }>, ok: string) {
    startTransition(async () => {
      const result = await work();
      if (result.success) {
        toast.success(ok);
        setNoteForm(null);
        setDecisionForm(null);
        setConfirmDelete(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  const exportNotes = () =>
    downloadText("meeting-notes.csv", toCsv(
      notes.map((n) => ({ ...n, team: n.team ? TEAM_LABELS[n.team] : "All teams", author: n.author?.full_name ?? "" })),
      [{ key: "meeting_date", label: "Date" }, { key: "title", label: "Title" }, { key: "team", label: "Team" }, { key: "agenda", label: "Agenda" }, { key: "blockers", label: "Blockers" }, { key: "action_items", label: "Action items" }, { key: "author", label: "Logged by" }]
    ), "text/csv;charset=utf-8");
  const exportDecisions = () =>
    downloadText("decisions.csv", toCsv(
      decisions.map((d) => ({ ...d, team: d.team ? TEAM_LABELS[d.team] : "All teams", author: d.author?.full_name ?? "" })),
      [{ key: "decided_on", label: "Date" }, { key: "title", label: "Title" }, { key: "category", label: "Category" }, { key: "team", label: "Team" }, { key: "decision", label: "Decision" }, { key: "rationale", label: "Rationale" }, { key: "owner_label", label: "Owner" }, { key: "author", label: "Logged by" }]
    ), "text/csv;charset=utf-8");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Templates */}
      <section className="rounded-2xl border p-5" style={card}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>Meeting hub &amp; decision log</h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--p-muted)" }}>Turn meetings into agendas, blockers, owners and decisions that don&apos;t disappear into chats.</p>
          </div>
          <span className="text-xs" style={{ color: "var(--p-muted)" }}>{notes.length} notes · {decisions.length} decisions</span>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {MEETING_TEMPLATES.map((t) => (
            <div key={t.title} className="rounded-xl border p-4" style={{ borderColor: "var(--p-border)", background: "var(--p-card-hover)" }}>
              <div className="text-xs" style={{ color: "var(--p-muted)" }}>{t.cadence} · {t.owner}</div>
              <div className="font-semibold text-sm mt-0.5" style={{ color: "var(--p-text)" }}>{t.title}</div>
              <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--p-text-secondary)" }}>
                {t.prompts.map((p) => <li key={p}>• {p}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        {/* Meeting notes */}
        <section className="rounded-2xl border overflow-hidden" style={card}>
          <div className="px-5 py-4 border-b flex items-center justify-between gap-2" style={{ borderColor: "var(--p-border)" }}>
            <h3 className="font-bold text-sm flex items-center gap-2" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>
              <MessageSquare className="w-4 h-4" style={{ color: "var(--p-accent)" }} /> Meeting notes
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={exportNotes} disabled={notes.length === 0} aria-label="Export meeting notes as CSV" className="p-1.5 rounded-lg disabled:opacity-40" style={{ color: "var(--p-muted)" }}><Download className="w-4 h-4" /></button>
              {canWrite && (
                <button onClick={() => setNoteForm({ title: "", meeting_date: todayIso, team: defaultTeam, agenda: "", blockers: "", action_items: "" })}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "var(--p-accent)" }}>
                  <Plus className="w-3.5 h-3.5" /> Note
                </button>
              )}
            </div>
          </div>
          {noteForm && (
            <div className="p-5 border-b space-y-2" style={{ borderColor: "var(--p-border)", background: "var(--p-card-hover)" }}>
              <div className="grid sm:grid-cols-2 gap-2">
                <input value={noteForm.title} onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })} placeholder="Meeting title *" aria-label="Meeting title" className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none sm:col-span-2" style={input} />
                <input type="date" value={noteForm.meeting_date} onChange={(e) => setNoteForm({ ...noteForm, meeting_date: e.target.value })} aria-label="Meeting date" className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={input} />
                <TeamSelect value={noteForm.team} onChange={(team) => setNoteForm({ ...noteForm, team })} teams={writableTeams} />
              </div>
              {(["agenda", "blockers", "action_items"] as const).map((field) => (
                <textarea key={field} value={noteForm[field]} onChange={(e) => setNoteForm({ ...noteForm, [field]: e.target.value })} rows={2} aria-label={field.replace("_", " ")}
                  placeholder={field === "agenda" ? "Agenda items" : field === "blockers" ? "Blockers raised" : "Action items: owner + next step + due date"}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none" style={input} />
              ))}
              <div className="flex gap-2">
                <button onClick={() => run(() => createMeetingNote(noteForm), "Meeting note saved.")} disabled={pending} className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: "#1B3464" }}>Save note</button>
                <button onClick={() => setNoteForm(null)} className="px-4 py-2 rounded-xl text-sm" style={{ color: "var(--p-muted)" }}>Cancel</button>
              </div>
            </div>
          )}
          <div className="divide-y" style={{ borderColor: "var(--p-border)" }}>
            {notes.length === 0 && <p className="px-5 py-8 text-sm text-center" style={{ color: "var(--p-muted)" }}>No meeting notes yet.</p>}
            {notes.map((n) => (
              <article key={n.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs" style={{ color: "var(--p-muted)" }}>{format(parseISO(n.meeting_date), "MMM d, yyyy")} · {n.team ? TEAM_LABELS[n.team] : "All teams"}{n.author?.full_name ? ` · ${n.author.full_name}` : ""}</div>
                    <h4 className="font-semibold text-sm mt-0.5" style={{ color: "var(--p-text)" }}>{n.title}</h4>
                  </div>
                  {canWriteTeam(viewer, n.team) && (confirmDelete === n.id ? (
                    <span className="flex items-center gap-2 text-xs"><button onClick={() => run(() => deleteMeetingNote(n.id), "Note deleted.")} className="text-red-500 font-semibold">Confirm</button><button onClick={() => setConfirmDelete(null)} style={{ color: "var(--p-muted)" }}>Keep</button></span>
                  ) : (
                    <button onClick={() => setConfirmDelete(n.id)} aria-label={`Delete note ${n.title}`} className="p-1 rounded-lg" style={{ color: "var(--p-muted)" }}><Trash2 className="w-4 h-4" /></button>
                  ))}
                </div>
                {([["Agenda", n.agenda], ["Blockers", n.blockers], ["Action items", n.action_items]] as const).filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} className="mt-2">
                    <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--p-muted)" }}>{label}</div>
                    <p className="text-sm whitespace-pre-line" style={{ color: "var(--p-text-secondary)" }}>{value}</p>
                  </div>
                ))}
              </article>
            ))}
          </div>
        </section>

        {/* Decisions */}
        <section className="rounded-2xl border overflow-hidden" style={card}>
          <div className="px-5 py-4 border-b flex items-center justify-between gap-2" style={{ borderColor: "var(--p-border)" }}>
            <h3 className="font-bold text-sm flex items-center gap-2" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>
              <Gavel className="w-4 h-4" style={{ color: "var(--p-accent)" }} /> Decision log
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={exportDecisions} disabled={decisions.length === 0} aria-label="Export decisions as CSV" className="p-1.5 rounded-lg disabled:opacity-40" style={{ color: "var(--p-muted)" }}><Download className="w-4 h-4" /></button>
              {canWrite && (
                <button onClick={() => setDecisionForm({ title: "", category: "General", decision: "", rationale: "", owner_label: "", team: defaultTeam, decided_on: todayIso })}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "var(--p-accent)" }}>
                  <Plus className="w-3.5 h-3.5" /> Decision
                </button>
              )}
            </div>
          </div>
          {decisionForm && (
            <div className="p-5 border-b space-y-2" style={{ borderColor: "var(--p-border)", background: "var(--p-card-hover)" }}>
              <input value={decisionForm.title} onChange={(e) => setDecisionForm({ ...decisionForm, title: e.target.value })} placeholder="Decision title *" aria-label="Decision title" className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={input} />
              <div className="grid sm:grid-cols-3 gap-2">
                <select value={decisionForm.category} onChange={(e) => setDecisionForm({ ...decisionForm, category: e.target.value as DecisionCategory })} aria-label="Category" className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={input}>
                  {DECISION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <TeamSelect value={decisionForm.team} onChange={(team) => setDecisionForm({ ...decisionForm, team })} teams={writableTeams} />
                <input type="date" value={decisionForm.decided_on} onChange={(e) => setDecisionForm({ ...decisionForm, decided_on: e.target.value })} aria-label="Decision date" className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={input} />
              </div>
              <textarea value={decisionForm.decision} onChange={(e) => setDecisionForm({ ...decisionForm, decision: e.target.value })} rows={2} placeholder="What was decided" aria-label="Decision" className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none" style={input} />
              <textarea value={decisionForm.rationale} onChange={(e) => setDecisionForm({ ...decisionForm, rationale: e.target.value })} rows={2} placeholder="Why" aria-label="Rationale" className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none" style={input} />
              <input value={decisionForm.owner_label} onChange={(e) => setDecisionForm({ ...decisionForm, owner_label: e.target.value })} placeholder="Owner" aria-label="Owner" className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={input} />
              <div className="flex gap-2">
                <button onClick={() => run(() => createDecision(decisionForm), "Decision logged.")} disabled={pending} className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: "#1B3464" }}>Log decision</button>
                <button onClick={() => setDecisionForm(null)} className="px-4 py-2 rounded-xl text-sm" style={{ color: "var(--p-muted)" }}>Cancel</button>
              </div>
            </div>
          )}
          <div className="divide-y" style={{ borderColor: "var(--p-border)" }}>
            {decisions.length === 0 && <p className="px-5 py-8 text-sm text-center" style={{ color: "var(--p-muted)" }}>No decisions logged yet.</p>}
            {decisions.map((d) => (
              <article key={d.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs" style={{ color: "var(--p-muted)" }}>{format(parseISO(d.decided_on), "MMM d, yyyy")} · {d.category} · {d.team ? TEAM_LABELS[d.team] : "All teams"}</div>
                    <h4 className="font-semibold text-sm mt-0.5" style={{ color: "var(--p-text)" }}>{d.title}</h4>
                  </div>
                  {canWriteTeam(viewer, d.team) && (confirmDelete === d.id ? (
                    <span className="flex items-center gap-2 text-xs"><button onClick={() => run(() => deleteDecision(d.id), "Decision deleted.")} className="text-red-500 font-semibold">Confirm</button><button onClick={() => setConfirmDelete(null)} style={{ color: "var(--p-muted)" }}>Keep</button></span>
                  ) : (
                    <button onClick={() => setConfirmDelete(d.id)} aria-label={`Delete decision ${d.title}`} className="p-1 rounded-lg" style={{ color: "var(--p-muted)" }}><Trash2 className="w-4 h-4" /></button>
                  ))}
                </div>
                {d.decision && <p className="text-sm mt-2 whitespace-pre-line" style={{ color: "var(--p-text)" }}>{d.decision}</p>}
                {d.rationale && <p className="text-xs mt-1 whitespace-pre-line" style={{ color: "var(--p-text-secondary)" }}>{d.rationale}</p>}
                {(d.owner_label || d.author?.full_name) && <div className="text-xs mt-2" style={{ color: "var(--p-muted)" }}>{d.owner_label && <>Owner: {d.owner_label}</>}{d.owner_label && d.author?.full_name ? " · " : ""}{d.author?.full_name && <>Logged by {d.author.full_name}</>}</div>}
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
