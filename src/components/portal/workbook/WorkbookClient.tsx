"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Circle, AlertTriangle, Save } from "lucide-react";
import { PHASE_IDS, PHASE_LABELS, TEAM_LABELS } from "@/lib/constants";
import { PHASE_META } from "@/lib/workbook/content";
import {
  deliverableIds, emptyPhaseData, fieldKey, overallPercent, phasePercent, type WorkbookPhaseData,
} from "@/lib/workbook/progress";
import type { PhaseId, RoleWorkbook } from "@/lib/workbook/types";
import { saveWorkbookPhase } from "@/app/portal/workbook/actions";

interface Props {
  role: RoleWorkbook;
  byPhase: Partial<Record<PhaseId, WorkbookPhaseData>>;
  initialPhase: PhaseId;
  holderName: string;
}

type SaveStatus = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; at: string } | { kind: "error"; message: string };
const SAVE_DELAY_MS = 650;

const card = { background: "var(--p-card)", borderColor: "var(--p-border)", boxShadow: "var(--p-shadow)" } as const;
const textarea = {
  background: "var(--p-card-hover)", borderColor: "var(--p-border)", color: "var(--p-text)", fontFamily: "var(--font-dm-sans)",
} as const;

export default function WorkbookClient({ role, byPhase, initialPhase, holderName }: Props) {
  const [data, setData] = useState<Record<PhaseId, WorkbookPhaseData>>(() =>
    Object.fromEntries(PHASE_IDS.map((p) => [p, byPhase[p] ?? emptyPhaseData()])) as Record<PhaseId, WorkbookPhaseData>
  );
  const [active, setActive] = useState<PhaseId>(initialPhase);
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });
  const dataRef = useRef(data);
  const timers = useRef<Partial<Record<PhaseId, ReturnType<typeof setTimeout>>>>({});
  const inFlight = useRef(0);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const phase = role.phases[active];
  const meta = PHASE_META[active];
  const ids = useMemo(() => deliverableIds(phase.deliverables), [phase.deliverables]);
  const overall = overallPercent(role, data);
  const current = phasePercent(phase, data[active]);

  async function flush(p: PhaseId) {
    inFlight.current += 1;
    setStatus({ kind: "saving" });
    const result = await saveWorkbookPhase({ positionSlug: role.slug, phase: p, data: dataRef.current[p] });
    inFlight.current -= 1;
    if (result.success) setStatus({ kind: "saved", at: result.updatedAt });
    else setStatus({ kind: "error", message: result.error });
  }

  function update(p: PhaseId, mutate: (d: WorkbookPhaseData) => WorkbookPhaseData) {
    setData((prev) => ({ ...prev, [p]: mutate(prev[p]) }));
    setStatus({ kind: "saving" });
    clearTimeout(timers.current[p]);
    timers.current[p] = setTimeout(() => {
      delete timers.current[p];
      void flush(p);
    }, SAVE_DELAY_MS);
  }

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (Object.keys(timers.current).length > 0 || inFlight.current > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    const pending = timers.current;
    return () => {
      window.removeEventListener("beforeunload", warn);
      Object.values(pending).forEach((t) => clearTimeout(t));
    };
  }, []);

  const toggleCheck = (id: string, checked: boolean) =>
    update(active, (d) => {
      const checks = { ...d.checks };
      if (checked) checks[id] = true;
      else delete checks[id];
      return { ...d, checks };
    });
  const setField = (key: string, value: string) => update(active, (d) => ({ ...d, fields: { ...d.fields, [key]: value } }));
  const setNotes = (value: string) => update(active, (d) => ({ ...d, notes: value }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl border p-6" style={card}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>{role.title}</h2>
            <p className="text-sm mt-1" style={{ color: "var(--p-muted)" }}>
              {TEAM_LABELS[role.team]} · {holderName}
            </p>
          </div>
          <div className="min-w-[200px]">
            <div className="flex items-center justify-between text-xs mb-1" style={{ color: "var(--p-muted)" }}>
              <span>Overall progress</span>
              <span className="font-semibold" style={{ color: "var(--p-text)" }}>{overall}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--p-border)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${overall}%`, background: "var(--p-accent-green)" }} />
            </div>
          </div>
        </div>

        {/* Phase tabs */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PHASE_IDS.map((p) => {
            const pct = phasePercent(role.phases[p], data[p]);
            const isActive = p === active;
            return (
              <button key={p} onClick={() => setActive(p)}
                className="rounded-xl border px-3 py-2.5 text-left transition-all"
                style={{
                  borderColor: isActive ? PHASE_META[p].color : "var(--p-border)",
                  background: isActive ? PHASE_META[p].color + "22" : "var(--p-card-hover)",
                }}>
                <div className="text-xs font-bold" style={{ color: isActive ? PHASE_META[p].color : "var(--p-text)" }}>{PHASE_LABELS[p]}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--p-muted)" }}>{pct}% · {role.phases[p].deliverables.length} deliverables</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Phase panel */}
      <div className="rounded-2xl border p-6 space-y-7" style={{ ...card, borderTop: `4px solid ${meta.color}` }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>{meta.label}</h3>
            <p className="text-sm mt-1" style={{ color: "var(--p-text-secondary)" }}>{phase.focus}</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: meta.color + "22", color: meta.color }}>{meta.dates}</span>
        </div>

        {phase.responsibilities.length > 0 && (
          <Section title="Key responsibilities">
            <ul className="space-y-1.5 text-sm" style={{ color: "var(--p-text-secondary)" }}>
              {phase.responsibilities.map((item) => <li key={item} className="flex gap-2"><span style={{ color: meta.color }}>•</span>{item}</li>)}
            </ul>
          </Section>
        )}

        <Section title={`Deliverables checklist · ${current}%`}>
          <div className="space-y-1">
            {phase.deliverables.map((item, i) => {
              const id = ids[i];
              const checked = data[active].checks[id] === true;
              return (
                <label key={id} className="flex items-start gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors"
                  style={{ background: checked ? "#2EA87A12" : "transparent" }}>
                  <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => toggleCheck(id, e.target.checked)} />
                  {checked
                    ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--p-accent-green)" }} />
                    : <Circle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--p-muted)" }} />}
                  <span className="text-sm" style={{ color: checked ? "var(--p-muted)" : "var(--p-text)", textDecoration: checked ? "line-through" : "none" }}>{item}</span>
                </label>
              );
            })}
            {phase.deliverables.length === 0 && <p className="text-sm" style={{ color: "var(--p-muted)" }}>No dated deliverables in this phase.</p>}
          </div>
        </Section>

        {phase.frameworks.map((fw, f) => (
          <Section key={`${fw.title}-${f}`} title={fw.title}>
            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--p-border)" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "var(--p-card-hover)" }}>
                    {fw.columns.map((c) => <th key={c} className="text-left px-3 py-2 font-semibold whitespace-nowrap" style={{ color: "var(--p-text)" }}>{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: fw.rows }, (_, r) => (
                    <tr key={r} className="border-t" style={{ borderColor: "var(--p-border)" }}>
                      {fw.columns.map((c, col) => {
                        const key = fieldKey("framework", f, r, col);
                        return (
                          <td key={key} className="p-1 align-top min-w-[140px]">
                            <textarea
                              value={data[active].fields[key] ?? ""}
                              onChange={(e) => setField(key, e.target.value)}
                              aria-label={`${fw.title}, row ${r + 1}, ${c}`}
                              rows={2}
                              className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none resize-y"
                              style={textarea}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        ))}

        {phase.weeklyPlan.length > 0 && (
          <Section title="Weekly planning grid">
            <div className="grid sm:grid-cols-2 gap-3">
              {phase.weeklyPlan.map((week, i) => {
                const key = fieldKey("weekly", i);
                return (
                  <div key={key} className="rounded-xl border p-3" style={{ borderColor: "var(--p-border)", background: "var(--p-card-hover)" }}>
                    <div className="text-xs font-bold" style={{ color: "var(--p-text)" }}>{week.week}</div>
                    <p className="text-xs mt-0.5 mb-2" style={{ color: "var(--p-muted)" }}>{week.tasks}</p>
                    <textarea value={data[active].fields[key] ?? ""} onChange={(e) => setField(key, e.target.value)}
                      placeholder="Your specific actions…" rows={3} aria-label={`Plan for ${week.week}`}
                      className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none resize-y" style={{ ...textarea, background: "var(--p-card)" }} />
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {phase.reflections.length > 0 && (
          <Section title="Reflection prompts">
            <div className="space-y-3">
              {phase.reflections.map((prompt, i) => {
                const key = fieldKey("reflection", i);
                return (
                  <div key={key}>
                    <p className="text-sm mb-1.5" style={{ color: "var(--p-text)" }}>{prompt}</p>
                    <textarea value={data[active].fields[key] ?? ""} onChange={(e) => setField(key, e.target.value)}
                      placeholder="Your thoughts…" rows={3} aria-label={prompt}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-y" style={textarea} />
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {phase.risks.length > 0 && (
          <Section title="Risk awareness">
            <ul className="space-y-1.5 text-sm" style={{ color: "var(--p-text-secondary)" }}>
              {phase.risks.map((risk) => <li key={risk} className="flex gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />{risk}</li>)}
            </ul>
          </Section>
        )}

        <Section title="Notes">
          <textarea value={data[active].notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Write your phase notes here…" rows={5} aria-label="Phase notes"
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none resize-y" style={textarea} />
          <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: status.kind === "error" ? "#EF4444" : "var(--p-muted)" }}>
            <Save className="w-3.5 h-3.5" />
            {status.kind === "idle" && "Autosave is on."}
            {status.kind === "saving" && "Saving…"}
            {status.kind === "saved" && `Saved ${new Date(status.at).toLocaleTimeString()}`}
            {status.kind === "error" && `Could not save: ${status.message}`}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--p-muted)" }}>{title}</h4>
      {children}
    </section>
  );
}
