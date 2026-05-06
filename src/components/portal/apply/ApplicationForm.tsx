"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Position, Profile } from "@/lib/types";
import { TEAM_LABELS, TIME_COMMITMENT_OPTIONS } from "@/lib/constants";
import { CheckCircle2, Lock, ChevronDown, ChevronUp, Star, ArrowRight } from "lucide-react";

interface Props {
  profile: Profile | null;
  positions: Position[];
  cycle: { id: string; type: string; year: number } | null;
  existingApplication: { id: string; status: string } | null;
  isInternal: boolean;
}

const PHASE_ORDER = ["FOUNDATIONS", "BUILD", "STABILIZATION", "EXECUTION"];
const PHASE_COLORS: Record<string, { bg: string; text: string }> = {
  FOUNDATIONS: { bg: "#1B346420", text: "#1B3464" },
  BUILD: { bg: "#2E7BC420", text: "#2E7BC4" },
  STABILIZATION: { bg: "#1A6B3C20", text: "#1A6B3C" },
  EXECUTION: { bg: "#2EA87A20", text: "#2EA87A" },
};

const COMMITMENTS = [
  { key: "understands_not_guaranteed", label: "I understand this is an application, not a guarantee." },
  { key: "understands_volunteering", label: "I understand I am volunteering my time and efforts." },
  { key: "doing_for_allah", label: "I am doing this for the sake of Allah ﷻ — not for clout." },
  { key: "will_be_professional", label: "I will leave outside drama at home and show up with ihsan." },
  { key: "understands_confidentiality", label: "MIST work is confidential — not even with family or past board members." },
  { key: "will_attend_meetings", label: "If selected, I will attend all required meetings." },
  { key: "willing_to_drive", label: "If selected, I am willing to drive for meetings." },
];

const inputStyle = {
  background: "var(--p-card)",
  borderColor: "var(--p-border)",
  color: "var(--p-text)",
};

export default function ApplicationForm({ profile, positions, cycle, existingApplication, isInternal }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [commitments, setCommitments] = useState<Record<string, boolean>>({
    understands_not_guaranteed: false, understands_volunteering: false,
    doing_for_allah: false, will_be_professional: false,
    understands_confidentiality: false, will_attend_meetings: false, willing_to_drive: false,
  });

  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    gender: "" as "brother" | "sister" | "",
    still_in_school: "" as "yes" | "no" | "",
    wants_position_change: "" as "stay" | "change" | "",
    expected_time_commitment: "",
    one_change_essay: "",
    fell_short_essay: "",
    why_mist: "",
    relevant_experience: "",
    current_position_id: "",
  });

  const [rankings, setRankings] = useState<string[]>(["", "", ""]);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const allCommitmentsChecked = Object.values(commitments).every(Boolean);
  const rankedPositions = rankings.filter(Boolean);

  function setRank(rank: number, positionId: string) {
    setRankings(prev => {
      const next = [...prev];
      for (let i = 0; i < 3; i++) { if (next[i] === positionId && i !== rank) next[i] = ""; }
      next[rank] = positionId;
      return next;
    });
  }

  const byTeam = positions.reduce<Record<string, Position[]>>((acc, p) => {
    acc[p.team] = acc[p.team] ?? [];
    acc[p.team].push(p);
    return acc;
  }, {});

  const STEPS = [
    { label: "Commitments", sub: "What you're agreeing to" },
    { label: "About You", sub: "Who you are" },
    { label: "Positions", sub: "What you want" },
    { label: "Essays", sub: "How you think" },
  ];

  async function handleSubmit() {
    if (rankedPositions.length === 0) { toast.error("Please rank at least one position."); return; }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !cycle) throw new Error("Not authenticated or no active cycle");
      const { data: app, error: appErr } = await supabase.from("applications").insert({
        cycle_id: cycle.id, applicant_id: user.id, applicant_email: user.email!,
        applicant_name: form.full_name, gender: form.gender,
        still_in_school: form.still_in_school === "yes", is_internal: isInternal,
        current_position_id: isInternal && form.current_position_id ? form.current_position_id : null,
        wants_position_change: isInternal ? form.wants_position_change === "change" : null,
        expected_time_commitment: form.expected_time_commitment,
        one_change_essay: form.one_change_essay, fell_short_essay: form.fell_short_essay,
        why_mist: !isInternal ? form.why_mist : null,
        relevant_experience: !isInternal ? form.relevant_experience : null,
        ...commitments,
      }).select().single();
      if (appErr) throw appErr;
      const rankPayload = rankings
        .map((posId, idx) => posId ? { application_id: app.id, position_id: posId, rank: idx + 1 } : null)
        .filter((x): x is { application_id: string; position_id: string; rank: number } => x !== null);
      const { error: rankErr } = await supabase.from("application_rankings").insert(rankPayload);
      if (rankErr) throw rankErr;
      toast.success("Application submitted! You'll hear back soon, inshallah. 🤲");
      router.push("/portal");
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const cardStyle = { background: "var(--p-card)", borderColor: "var(--p-border)" };

  if (!cycle) return (
    <div className="max-w-lg mx-auto py-20 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "var(--p-card)" }}>
        <Lock className="w-7 h-7" style={{ color: "var(--p-muted)" }} />
      </div>
      <h2 className="text-2xl font-extrabold mb-2" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>Recruitment is closed</h2>
      <p style={{ color: "var(--p-muted)" }}>Applications aren&apos;t open right now. Check back soon!</p>
    </div>
  );

  if (existingApplication) return (
    <div className="max-w-lg mx-auto py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-[#2EA87A] flex items-center justify-center mx-auto mb-5">
        <CheckCircle2 className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-2xl font-extrabold mb-2" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>You&apos;re in the queue.</h2>
      <p style={{ color: "var(--p-muted)" }}>Status: <span className="font-semibold capitalize" style={{ color: "var(--p-text)" }}>{existingApplication.status.replace(/_/g, " ")}</span></p>
      <p className="text-sm mt-2" style={{ color: "var(--p-muted)" }}>You&apos;ll be notified of updates here and by email.</p>
    </div>
  );

  if (cycle.type === "internal" && !isInternal) return (
    <div className="max-w-lg mx-auto py-20 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "var(--p-card)" }}>
        <Lock className="w-7 h-7" style={{ color: "#F59E0B" }} />
      </div>
      <h2 className="text-2xl font-extrabold mb-2" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>Internal only right now.</h2>
      <p style={{ color: "var(--p-muted)" }}>External recruitment opens soon. Hang tight.</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6" style={{ animation: "fadeInUp 0.4s ease both" }}>
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>
          {cycle.year} Board Application
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--p-muted)" }}>
          {isInternal ? "Internal recruitment · returning member" : "External recruitment · open to all"}
        </p>
      </div>

      {/* Step bar */}
      <div className="flex gap-2">
        {STEPS.map((s, i) => (
          <button key={i} onClick={() => i < step && setStep(i)}
            className="flex-1 py-2.5 px-3 rounded-xl text-left transition-all duration-200 border"
            style={{
              background: i === step ? "#1B3464" : i < step ? "#2EA87A15" : "var(--p-card)",
              borderColor: i === step ? "#1B3464" : i < step ? "#2EA87A40" : "var(--p-border)",
              cursor: i < step ? "pointer" : "default",
            }}>
            <div className="text-xs font-bold" style={{ color: i === step ? "#fff" : i < step ? "#2EA87A" : "var(--p-muted)" }}>
              {i < step ? "✓" : `0${i + 1}`}
            </div>
            <div className="text-xs mt-0.5 hidden sm:block truncate" style={{ color: i === step ? "rgba(255,255,255,0.7)" : "var(--p-muted)" }}>
              {s.label}
            </div>
          </button>
        ))}
      </div>

      {/* ── STEP 0: Commitments ── */}
      {step === 0 && (
        <div className="rounded-2xl border p-6 space-y-3" style={cardStyle}>
          <div className="rounded-xl p-4 mb-2" style={{ background: "#1B346415", borderLeft: "3px solid #1B3464" }}>
            <p className="text-sm font-medium" style={{ color: "var(--p-text)" }}>
              Read each commitment carefully. All boxes must be checked to continue.
            </p>
          </div>
          {COMMITMENTS.map(c => (
            <label key={c.key} className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-150"
              style={{
                borderColor: commitments[c.key] ? "#2EA87A50" : "var(--p-border)",
                background: commitments[c.key] ? "#2EA87A10" : "var(--p-card-hover)",
              }}>
              <input type="checkbox" checked={commitments[c.key]}
                onChange={e => setCommitments(p => ({ ...p, [c.key]: e.target.checked }))}
                className="mt-0.5 w-4 h-4 accent-[#1A6B3C]" />
              <span className="text-sm flex-1" style={{ color: "var(--p-text-secondary)" }}>{c.label}</span>
              {commitments[c.key] && <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#2EA87A]" />}
            </label>
          ))}
          <button onClick={() => setStep(1)} disabled={!allCommitmentsChecked}
            className="w-full mt-2 text-white font-bold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            style={{ background: allCommitmentsChecked ? "#1B3464" : "var(--p-border)", cursor: allCommitmentsChecked ? "pointer" : "not-allowed" }}>
            I agree — continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── STEP 1: About You ── */}
      {step === 1 && (
        <div className="rounded-2xl border p-6 space-y-5" style={cardStyle}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--p-muted)" }}>Full Name</label>
            <input type="text" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              placeholder="Your full name" className="w-full border rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={inputStyle} onFocus={e => (e.target as HTMLInputElement).style.borderColor = "#2E7BC4"}
              onBlur={e => (e.target as HTMLInputElement).style.borderColor = "var(--p-border)"} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--p-muted)" }}>I am a</label>
            <div className="grid grid-cols-2 gap-3">
              {(["brother", "sister"] as const).map(g => (
                <button key={g} onClick={() => setForm(p => ({ ...p, gender: g }))}
                  className="py-3 rounded-xl border font-semibold text-sm capitalize transition-all duration-150"
                  style={{
                    borderColor: form.gender === g ? "#1B3464" : "var(--p-border)",
                    background: form.gender === g ? "#1B346415" : "var(--p-card-hover)",
                    color: form.gender === g ? "#1B3464" : "var(--p-muted)",
                  }}>A {g}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--p-muted)" }}>Still in school?</label>
            <div className="grid grid-cols-2 gap-3">
              {(["yes", "no"] as const).map(v => (
                <button key={v} onClick={() => setForm(p => ({ ...p, still_in_school: v }))}
                  className="py-3 rounded-xl border font-semibold text-sm transition-all duration-150"
                  style={{
                    borderColor: form.still_in_school === v ? "#1B3464" : "var(--p-border)",
                    background: form.still_in_school === v ? "#1B346415" : "var(--p-card-hover)",
                    color: form.still_in_school === v ? "#1B3464" : "var(--p-muted)",
                  }}>{v === "yes" ? "Yes" : "No"}</button>
              ))}
            </div>
          </div>

          {isInternal && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--p-muted)" }}>Position preference</label>
              <div className="space-y-2">
                {(["stay", "change"] as const).map(v => (
                  <button key={v} onClick={() => setForm(p => ({ ...p, wants_position_change: v }))}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl border text-sm font-medium text-left transition-all duration-150"
                    style={{
                      borderColor: form.wants_position_change === v ? "#1B3464" : "var(--p-border)",
                      background: form.wants_position_change === v ? "#1B346415" : "var(--p-card-hover)",
                      color: form.wants_position_change === v ? "#1B3464" : "var(--p-text-secondary)",
                    }}>
                    {v === "stay" ? "I like where I am — keep my role" : "I want to explore other positions"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--p-muted)" }}>Expected time commitment</label>
            <select value={form.expected_time_commitment} onChange={e => setForm(p => ({ ...p, expected_time_commitment: e.target.value }))}
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none"
              style={{ ...inputStyle, appearance: "none" }}>
              <option value="">Select one…</option>
              {TIME_COMMITMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {!isInternal && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--p-muted)" }}>Why MIST Dallas?</label>
                <textarea value={form.why_mist} onChange={e => setForm(p => ({ ...p, why_mist: e.target.value }))}
                  rows={3} placeholder="What draws you to this work?" className="w-full border rounded-xl px-4 py-3 text-sm outline-none resize-none"
                  style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--p-muted)" }}>Relevant experience</label>
                <textarea value={form.relevant_experience} onChange={e => setForm(p => ({ ...p, relevant_experience: e.target.value }))}
                  rows={3} placeholder="Leadership, events, volunteering…" className="w-full border rounded-xl px-4 py-3 text-sm outline-none resize-none"
                  style={inputStyle} />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(0)} className="px-5 py-3 rounded-xl border text-sm font-medium transition-colors"
              style={{ borderColor: "var(--p-border)", color: "var(--p-muted)", background: "var(--p-card-hover)" }}>Back</button>
            <button onClick={() => setStep(2)}
              disabled={!form.full_name || !form.gender || !form.still_in_school || !form.expected_time_commitment || (isInternal && !form.wants_position_change)}
              className="flex-1 text-white font-bold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              style={{ background: "#1B3464" }}>
              Next: Positions <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Positions ── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Rank slots */}
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map(i => {
              const pos = positions.find(p => p.id === rankings[i]);
              return (
                <div key={i} className="relative p-4 rounded-2xl border-2 min-h-[90px] transition-all"
                  style={{
                    borderColor: pos ? "#1B3464" : "var(--p-border)",
                    borderStyle: pos ? "solid" : "dashed",
                    background: pos ? "#1B346410" : "var(--p-card)",
                  }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: pos ? "#1B3464" : "var(--p-muted)" }}>{i + 1}</div>
                    <span className="text-xs" style={{ color: "var(--p-muted)" }}>{["1st", "2nd", "3rd"][i]} choice</span>
                  </div>
                  {pos ? (
                    <>
                      <p className="text-xs font-bold leading-tight" style={{ color: "#1B3464" }}>{pos.title}</p>
                      <span className="mt-1 inline-block text-xs px-1.5 py-0.5 rounded-full"
                        style={{ background: PHASE_COLORS[pos.phase]?.bg, color: PHASE_COLORS[pos.phase]?.text }}>
                        {pos.phase}
                      </span>
                      <button onClick={() => setRank(i, "")}
                        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                        style={{ background: "var(--p-border)", color: "var(--p-muted)" }}>×</button>
                    </>
                  ) : (
                    <p className="text-xs" style={{ color: "var(--p-muted)" }}>Select below</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Team browser */}
          <div className="rounded-2xl border overflow-hidden" style={cardStyle}>
            {Object.entries(byTeam).sort(([a], [b]) => a.localeCompare(b)).map(([team, teamPositions]) => {
              const open = expandedTeam === team;
              return (
                <div key={team} className="border-b last:border-b-0" style={{ borderColor: "var(--p-border)" }}>
                  <button onClick={() => setExpandedTeam(open ? null : team)}
                    className="w-full flex items-center justify-between px-5 py-3.5 transition-colors"
                    style={{ background: open ? "var(--p-card-hover)" : "transparent" }}
                    onMouseEnter={e => !open && ((e.currentTarget as HTMLElement).style.background = "var(--p-card-hover)")}
                    onMouseLeave={e => !open && ((e.currentTarget as HTMLElement).style.background = "transparent")}>
                    <span className="font-bold text-sm" style={{ color: "var(--p-text)" }}>{TEAM_LABELS[team as keyof typeof TEAM_LABELS]}</span>
                    {open ? <ChevronUp className="w-4 h-4" style={{ color: "var(--p-muted)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "var(--p-muted)" }} />}
                  </button>
                  {open && (
                    <div className="divide-y" style={{ borderColor: "var(--p-border)" }}>
                      {teamPositions.sort((a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase)).map(pos => {
                        const assignedRank = rankings.indexOf(pos.id);
                        const isRanked = assignedRank !== -1;
                        const nextOpen = rankings.findIndex(r => !r);
                        return (
                          <div key={pos.id} className="flex items-center px-5 py-3" style={{ borderColor: "var(--p-border)" }}>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium truncate block" style={{ color: "var(--p-text)" }}>{pos.title}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded-full inline-block mt-0.5"
                                style={{ background: PHASE_COLORS[pos.phase]?.bg, color: PHASE_COLORS[pos.phase]?.text }}>
                                {pos.phase}
                              </span>
                            </div>
                            {isRanked ? (
                              <div className="flex items-center gap-2 ml-3">
                                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white" style={{ background: "#1B3464" }}>
                                  <Star className="w-3 h-3 fill-current" /> #{assignedRank + 1}
                                </div>
                                <button onClick={() => setRank(assignedRank, "")} className="text-lg leading-none transition-colors" style={{ color: "var(--p-muted)" }}>×</button>
                              </div>
                            ) : (
                              <button onClick={() => nextOpen !== -1 && setRank(nextOpen, pos.id)} disabled={nextOpen === -1}
                                className="ml-3 px-3 py-1.5 border rounded-lg text-xs font-medium transition-all"
                                style={{ borderColor: "var(--p-border)", color: "var(--p-muted)", background: "var(--p-card-hover)" }}>
                                {nextOpen === -1 ? "Full" : `Rank ${nextOpen + 1}`}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-5 py-3 rounded-xl border text-sm font-medium"
              style={{ borderColor: "var(--p-border)", color: "var(--p-muted)", background: "var(--p-card-hover)" }}>Back</button>
            <button onClick={() => setStep(3)} disabled={rankedPositions.length === 0}
              className="flex-1 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              style={{ background: "#1B3464", opacity: rankedPositions.length === 0 ? 0.4 : 1 }}>
              Next: Essays <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Essays ── */}
      {step === 3 && (
        <div className="rounded-2xl border p-6 space-y-6" style={cardStyle}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--p-muted)" }}>Essay 1</label>
            <p className="font-bold mb-1" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>
              What is ONE change you would implement in your team next year, and how would you execute it?
            </p>
            <p className="text-xs mb-3" style={{ color: "var(--p-muted)" }}>Be specific. Problem → solution → steps.</p>
            <textarea value={form.one_change_essay} onChange={e => setForm(p => ({ ...p, one_change_essay: e.target.value }))}
              rows={6} placeholder="Describe the change and your step-by-step plan…" className="w-full border rounded-xl px-4 py-3 text-sm outline-none resize-none"
              style={inputStyle} />
            <div className="text-right text-xs mt-1" style={{ color: "var(--p-muted)" }}>{form.one_change_essay.length} chars</div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--p-muted)" }}>Essay 2</label>
            <p className="font-bold mb-1" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>
              Describe a time you fell short in your role. What happened, and what would you do differently?
            </p>
            <p className="text-xs mb-3" style={{ color: "var(--p-muted)" }}>
              {isInternal ? "Reflect honestly on your experience this past year." : "From any leadership, volunteer, or academic context."}
            </p>
            <textarea value={form.fell_short_essay} onChange={e => setForm(p => ({ ...p, fell_short_essay: e.target.value }))}
              rows={6} placeholder="Be honest and reflective…" className="w-full border rounded-xl px-4 py-3 text-sm outline-none resize-none"
              style={inputStyle} />
            <div className="text-right text-xs mt-1" style={{ color: "var(--p-muted)" }}>{form.fell_short_essay.length} chars</div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="px-5 py-3 rounded-xl border text-sm font-medium"
              style={{ borderColor: "var(--p-border)", color: "var(--p-muted)", background: "var(--p-card-hover)" }}>Back</button>
            <button onClick={handleSubmit} disabled={submitting || !form.one_change_essay.trim() || !form.fell_short_essay.trim()}
              className="flex-1 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              style={{ background: "#1A6B3C", opacity: (!form.one_change_essay.trim() || !form.fell_short_essay.trim()) ? 0.4 : 1 }}>
              {submitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting…</> : <>Submit Application 🤲</>}
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
