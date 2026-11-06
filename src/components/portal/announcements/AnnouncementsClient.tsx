"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Megaphone, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import type { Announcement, AnnouncementAudience, Priority, Team } from "@/lib/types";
import { AUDIENCE_LABELS, PRIORITY_COLORS, TEAM_LABELS, TEAM_ORDER } from "@/lib/constants";
import { upsertAnnouncement, deleteAnnouncement, type AnnouncementInput } from "@/app/portal/announcements/actions";

interface Props { announcements: Announcement[] }

const card = { background: "var(--p-card)", borderColor: "var(--p-border)", boxShadow: "var(--p-shadow)" } as const;
const input = { background: "var(--p-card)", borderColor: "var(--p-border)", color: "var(--p-text)" } as const;
const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];
const AUDIENCES = Object.keys(AUDIENCE_LABELS) as AnnouncementAudience[];

const emptyForm = (): AnnouncementInput => ({ title: "", body: "", audience: "all", audience_team: null, priority: "medium", is_active: true });
const toForm = (a: Announcement): AnnouncementInput => ({
  id: a.id, title: a.title, body: a.body, audience: a.audience, audience_team: a.audience_team, priority: a.priority, is_active: a.is_active,
});

export default function AnnouncementsClient({ announcements }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<AnnouncementInput | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function run(work: () => Promise<{ success: boolean; error?: string }>, ok: string) {
    startTransition(async () => {
      const result = await work();
      if (result.success) {
        toast.success(ok);
        setForm(null);
        setConfirmDelete(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-2xl border p-5 flex flex-wrap items-center justify-between gap-4" style={card}>
        <div>
          <h2 className="font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>Announcements</h2>
          <p className="text-sm mt-1" style={{ color: "var(--p-muted)" }}>The two most urgent active announcements show on everyone&apos;s dashboard, filtered by audience.</p>
        </div>
        <button onClick={() => setForm(emptyForm())} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: "var(--p-accent)" }}>
          <Plus className="w-3.5 h-3.5" /> New announcement
        </button>
      </div>

      {form && (
        <div className="rounded-2xl border p-5 space-y-3" style={card}>
          <h3 className="font-bold text-sm" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>{form.id ? "Edit announcement" : "New announcement"}</h3>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title *" aria-label="Title"
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={input} />
          <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Body" aria-label="Body" rows={3}
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none" style={input} />
          <div className="grid sm:grid-cols-3 gap-3">
            <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value as AnnouncementAudience })} aria-label="Audience"
              className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={input}>
              {AUDIENCES.map((a) => <option key={a} value={a}>{AUDIENCE_LABELS[a]}</option>)}
            </select>
            {form.audience === "team" && (
              <select value={form.audience_team ?? ""} onChange={(e) => setForm({ ...form, audience_team: (e.target.value || null) as Team | null })} aria-label="Team"
                className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={input}>
                <option value="">Choose a team…</option>
                {TEAM_ORDER.map((t) => <option key={t} value={t}>{TEAM_LABELS[t]}</option>)}
              </select>
            )}
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })} aria-label="Priority"
              className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none capitalize" style={input}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--p-text-secondary)" }}>
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-[#2E7BC4]" />
              Active
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={() => run(() => upsertAnnouncement(form), form.id ? "Announcement updated." : "Announcement posted.")} disabled={pending}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: "#1B3464" }}>
              {pending ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setForm(null)} className="px-4 py-2 rounded-xl text-sm border" style={{ borderColor: "var(--p-border)", color: "var(--p-muted)" }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border overflow-hidden" style={card}>
        {announcements.length === 0 ? (
          <div className="py-12 text-center">
            <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: "var(--p-muted)" }} />
            <p className="text-sm" style={{ color: "var(--p-muted)" }}>No announcements yet.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--p-border)" }}>
            {announcements.map((a) => (
              <article key={a.id} className="px-5 py-4 flex items-start gap-4" style={{ opacity: a.is_active ? 1 : 0.6 }}>
                <div className="w-1.5 self-stretch rounded-full flex-shrink-0" style={{ background: PRIORITY_COLORS[a.priority] }} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-sm" style={{ color: "var(--p-text)" }}>{a.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: PRIORITY_COLORS[a.priority] + "22", color: PRIORITY_COLORS[a.priority] }}>{a.priority}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--p-card-hover)", color: "var(--p-muted)" }}>
                      {a.audience === "team" && a.audience_team ? TEAM_LABELS[a.audience_team] : AUDIENCE_LABELS[a.audience]}
                    </span>
                    {!a.is_active && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--p-card-hover)", color: "var(--p-muted)" }}>Hidden</span>}
                  </div>
                  {a.body && <p className="text-sm mt-1 whitespace-pre-line" style={{ color: "var(--p-text-secondary)" }}>{a.body}</p>}
                  <div className="text-xs mt-2" style={{ color: "var(--p-muted)" }}>Posted {format(parseISO(a.created_at), "MMM d, yyyy")}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 text-xs font-medium">
                  <button onClick={() => run(() => upsertAnnouncement({ ...toForm(a), is_active: !a.is_active }), a.is_active ? "Hidden." : "Visible again.")} disabled={pending}
                    aria-label={a.is_active ? "Hide announcement" : "Show announcement"} className="p-1.5 rounded-lg" style={{ color: "var(--p-muted)" }}>
                    {a.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setForm(toForm(a))} aria-label="Edit announcement" className="p-1.5 rounded-lg" style={{ color: "var(--p-muted)" }}><Pencil className="w-4 h-4" /></button>
                  {confirmDelete === a.id ? (
                    <>
                      <button onClick={() => run(() => deleteAnnouncement(a.id), "Announcement deleted.")} disabled={pending} className="text-red-500 font-semibold">Confirm</button>
                      <button onClick={() => setConfirmDelete(null)} style={{ color: "var(--p-muted)" }}>Keep</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDelete(a.id)} aria-label="Delete announcement" className="p-1.5 rounded-lg" style={{ color: "var(--p-muted)" }}><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
