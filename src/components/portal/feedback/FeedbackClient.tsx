"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lightbulb, Plus, Pencil, Trash2 } from "lucide-react";
import type { FeedbackTheme } from "@/lib/types";
import type { PhaseId } from "@/lib/workbook/types";
import { PHASE_IDS, PHASE_LABELS, phaseIdFromEnum } from "@/lib/constants";
import { upsertFeedbackTheme, deleteFeedbackTheme, type FeedbackThemeInput } from "@/app/portal/feedback/actions";

interface Props { themes: FeedbackTheme[] }

const card = { background: "var(--p-card)", borderColor: "var(--p-border)", boxShadow: "var(--p-shadow)" } as const;
const input = { background: "var(--p-card)", borderColor: "var(--p-border)", color: "var(--p-text)" } as const;

const emptyForm = (sort: number): FeedbackThemeInput => ({ theme: "", source: "", sentiment: "", owner_label: "", phase: null, status: "Open", color: "#1f8a9b", action: "", sort_order: sort });
const toForm = (t: FeedbackTheme): FeedbackThemeInput => ({
  id: t.id, theme: t.theme, source: t.source, sentiment: t.sentiment, owner_label: t.owner_label,
  phase: t.phase ? phaseIdFromEnum(t.phase) : null, status: t.status, color: t.color, action: t.action, sort_order: t.sort_order,
});

export default function FeedbackClient({ themes }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FeedbackThemeInput | null>(null);
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

  const field = (key: keyof FeedbackThemeInput, placeholder: string, rows?: number) =>
    rows ? (
      <textarea value={String(form?.[key] ?? "")} onChange={(e) => form && setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} aria-label={placeholder} rows={rows}
        className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none" style={input} />
    ) : (
      <input value={String(form?.[key] ?? "")} onChange={(e) => form && setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} aria-label={placeholder}
        className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={input} />
    );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="rounded-2xl border p-5 flex flex-wrap items-center justify-between gap-4" style={card}>
        <div>
          <h2 className="font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>Feedback themes</h2>
          <p className="text-sm mt-1" style={{ color: "var(--p-muted)" }}>Recurring themes from debriefs and surveys, each with an owner and an action plan.</p>
        </div>
        <button onClick={() => setForm(emptyForm(themes.length + 1))} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: "var(--p-accent)" }}>
          <Plus className="w-3.5 h-3.5" /> New theme
        </button>
      </div>

      {form && (
        <div className="rounded-2xl border p-5 space-y-3" style={card}>
          <h3 className="font-bold text-sm" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>{form.id ? "Edit theme" : "New theme"}</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {field("theme", "Theme *")}
            {field("owner_label", "Owner (e.g. Ops 2 + PR)")}
            {field("source", "Source (debriefs, surveys…)")}
            {field("status", "Status (Open, In progress, Live…)")}
            <select value={form.phase ?? ""} onChange={(e) => setForm({ ...form, phase: (e.target.value || null) as PhaseId | null })} aria-label="Phase"
              className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={input}>
              <option value="">No phase</option>
              {PHASE_IDS.map((p) => <option key={p} value={p}>{PHASE_LABELS[p]}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <input type="color" value={form.color ?? "#1f8a9b"} onChange={(e) => setForm({ ...form, color: e.target.value })} aria-label="Colour" className="w-10 h-10 rounded-lg border" style={{ borderColor: "var(--p-border)" }} />
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} aria-label="Sort order" className="w-24 border rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={input} />
              <span className="text-xs" style={{ color: "var(--p-muted)" }}>order</span>
            </div>
          </div>
          {field("sentiment", "What people are saying", 2)}
          {field("action", "What we are doing about it", 2)}
          <div className="flex gap-2">
            <button onClick={() => run(() => upsertFeedbackTheme(form), form.id ? "Theme updated." : "Theme added.")} disabled={pending} className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: "#1B3464" }}>{pending ? "Saving…" : "Save"}</button>
            <button onClick={() => setForm(null)} className="px-4 py-2 rounded-xl text-sm border" style={{ borderColor: "var(--p-border)", color: "var(--p-muted)" }}>Cancel</button>
          </div>
        </div>
      )}

      {themes.length === 0 ? (
        <div className="rounded-2xl border py-12 text-center" style={card}>
          <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: "var(--p-muted)" }} />
          <p className="text-sm" style={{ color: "var(--p-muted)" }}>No feedback themes yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {themes.map((t) => (
            <article key={t.id} className="rounded-2xl border p-5" style={{ ...card, borderTop: `4px solid ${t.color ?? "var(--p-accent)"}` }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs" style={{ color: "var(--p-muted)" }}>{t.owner_label}{t.phase ? ` · ${PHASE_LABELS[phaseIdFromEnum(t.phase)]}` : ""}</div>
                  <h3 className="font-semibold mt-0.5" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>{t.theme}</h3>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: (t.color ?? "#2E7BC4") + "22", color: t.color ?? "var(--p-accent)" }}>{t.status}</span>
              </div>
              {t.sentiment && <p className="text-sm mt-3 italic" style={{ color: "var(--p-text-secondary)" }}>&ldquo;{t.sentiment}&rdquo;</p>}
              {t.action && <p className="text-sm mt-2" style={{ color: "var(--p-text)" }}>{t.action}</p>}
              <div className="mt-3 flex items-center justify-between text-xs" style={{ color: "var(--p-muted)" }}>
                <span>{t.source}</span>
                <span className="flex items-center gap-2">
                  <button onClick={() => setForm(toForm(t))} aria-label={`Edit ${t.theme}`} className="p-1 rounded-lg"><Pencil className="w-4 h-4" /></button>
                  {confirmDelete === t.id ? (
                    <><button onClick={() => run(() => deleteFeedbackTheme(t.id), "Theme deleted.")} className="text-red-500 font-semibold">Confirm</button><button onClick={() => setConfirmDelete(null)}>Keep</button></>
                  ) : (
                    <button onClick={() => setConfirmDelete(t.id)} aria-label={`Delete ${t.theme}`} className="p-1 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  )}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
