"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Position, Profile } from "@/lib/types";
import { TEAM_LABELS, TIME_COMMITMENT_OPTIONS } from "@/lib/constants";
import { CheckCircle2, AlertCircle, Lock, ChevronDown, ChevronUp, Star } from "lucide-react";

interface Props {
  profile: Profile | null;
  positions: Position[];
  cycle: { id: string; type: string; year: number } | null;
  existingApplication: { id: string; status: string } | null;
  isInternal: boolean;
}

const PHASE_ORDER = ["FOUNDATIONS", "BUILD", "STABILIZATION", "EXECUTION"];
const PHASE_COLORS: Record<string, string> = {
  FOUNDATIONS: "bg-[#EEF2F9] text-[#1B3464]",
  BUILD: "bg-blue-50 text-[#2E7BC4]",
  STABILIZATION: "bg-green-50 text-[#1A6B3C]",
  EXECUTION: "bg-teal-50 text-[#2EA87A]",
};

const COMMITMENTS = [
  { key: "understands_not_guaranteed", label: "I understand that this is an application and not a guarantee." },
  { key: "understands_volunteering", label: "I understand that I am volunteering my time and efforts." },
  { key: "doing_for_allah", label: "I am doing this for the sake of Allah ﷻ and not for clout or bragging rights." },
  { key: "will_be_professional", label: "I will leave outside drama at home and treat MIST with professionalism and ihsan." },
  { key: "understands_confidentiality", label: "I understand that MIST work is confidential — not even with my parents, siblings, besties, cousins, or past MIST board members." },
  { key: "will_attend_meetings", label: "If selected, I will attend all required meetings." },
  { key: "willing_to_drive", label: "If selected, I am willing to drive for meetings." },
];

export default function ApplicationForm({ profile, positions, cycle, existingApplication, isInternal }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0); // 0 = commitments, 1 = about you, 2 = position ranking, 3 = essay questions
  const [submitting, setSubmitting] = useState(false);

  const [commitments, setCommitments] = useState<Record<string, boolean>>({
    understands_not_guaranteed: false,
    understands_volunteering: false,
    doing_for_allah: false,
    will_be_professional: false,
    understands_confidentiality: false,
    will_attend_meetings: false,
    willing_to_drive: false,
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
    setRankings((prev) => {
      const next = [...prev];
      // Remove this position from other slots
      for (let i = 0; i < 3; i++) {
        if (next[i] === positionId && i !== rank) next[i] = "";
      }
      next[rank] = positionId;
      return next;
    });
  }

  // Group positions by team
  const byTeam = positions.reduce<Record<string, Position[]>>((acc, p) => {
    acc[p.team] = acc[p.team] ?? [];
    acc[p.team].push(p);
    return acc;
  }, {});

  const steps = [
    { label: "Commitments", icon: "📋" },
    { label: "About You", icon: "👤" },
    { label: "Positions", icon: "⭐" },
    { label: "Essays", icon: "✍️" },
  ];

  async function handleSubmit() {
    if (rankedPositions.length === 0) {
      toast.error("Please rank at least one position.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !cycle) throw new Error("Not authenticated or no active cycle");

      const appPayload = {
        cycle_id: cycle.id,
        applicant_id: user.id,
        applicant_email: user.email!,
        applicant_name: form.full_name,
        gender: form.gender,
        still_in_school: form.still_in_school === "yes",
        is_internal: isInternal,
        current_position_id: isInternal && form.current_position_id ? form.current_position_id : null,
        wants_position_change: isInternal ? form.wants_position_change === "change" : null,
        expected_time_commitment: form.expected_time_commitment,
        one_change_essay: form.one_change_essay,
        fell_short_essay: form.fell_short_essay,
        why_mist: !isInternal ? form.why_mist : null,
        relevant_experience: !isInternal ? form.relevant_experience : null,
        ...commitments,
      };

      const { data: app, error: appErr } = await supabase
        .from("applications")
        .insert(appPayload)
        .select()
        .single();

      if (appErr) throw appErr;

      const rankPayload = rankings
        .map((posId, idx) => posId ? { application_id: app.id, position_id: posId, rank: idx + 1 } : null)
        .filter(Boolean);

      const { error: rankErr } = await supabase.from("application_rankings").insert(rankPayload);
      if (rankErr) throw rankErr;

      toast.success("Application submitted! You'll hear back soon, inshallah. 🤲");
      router.push("/portal");
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!cycle) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Lock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#2D2F3A] mb-2">Recruitment is closed</h2>
          <p className="text-gray-500">Applications aren&apos;t open right now. Check back soon!</p>
        </div>
      </div>
    );
  }

  if (existingApplication) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#2D2F3A] mb-2">Application submitted!</h2>
          <p className="text-gray-500 mb-4">
            Your application is currently{" "}
            <span className="font-semibold text-[#2D2F3A]">
              {existingApplication.status.replace(/_/g, " ")}
            </span>
            .
          </p>
          <p className="text-gray-400 text-sm">You&apos;ll be notified of any updates here and by email.</p>
        </div>
      </div>
    );
  }

  if (cycle.type === "internal" && !isInternal) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Lock className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#2D2F3A] mb-2">Internal recruitment only</h2>
          <p className="text-gray-500">
            Applications are currently open to current board members only. External recruitment will open soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#2D2F3A]">
          {cycle.year} Board Application
        </h2>
        <p className="text-gray-500 mt-1">
          {isInternal ? "Internal recruitment — returning member" : "External recruitment — open to all"}
        </p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                i === step
                  ? "bg-[#1B3464] text-white"
                  : i < step
                  ? "bg-green-50 text-green-700 cursor-pointer hover:bg-green-100"
                  : "bg-gray-100 text-gray-400 cursor-default"
              }`}
            >
              <span>{s.icon}</span>
              <span className="hidden sm:block">{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px ${i < step ? "bg-green-300" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      {/* ── STEP 0: Commitments ── */}
      {step === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <div className="flex items-start gap-3 p-4 bg-[#EEF2F9] rounded-xl mb-6">
            <AlertCircle className="w-5 h-5 text-[#1B3464] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-[#1B3464]">
              Before applying, please read and acknowledge each commitment below.
              These are the expectations for every board member.
            </p>
          </div>
          {COMMITMENTS.map((c) => (
            <label
              key={c.key}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                commitments[c.key]
                  ? "border-green-200 bg-green-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="checkbox"
                checked={commitments[c.key]}
                onChange={(e) => setCommitments((prev) => ({ ...prev, [c.key]: e.target.checked }))}
                className="mt-0.5 w-4 h-4 accent-[#1A6B3C]"
              />
              <span className="text-sm text-gray-700">{c.label}</span>
              {commitments[c.key] && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto flex-shrink-0" />}
            </label>
          ))}
          <button
            onClick={() => setStep(1)}
            disabled={!allCommitmentsChecked}
            className="w-full mt-4 bg-[#1B3464] text-white font-semibold py-3 rounded-xl hover:bg-[#2E7BC4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            I agree — continue
          </button>
        </div>
      )}

      {/* ── STEP 1: About You ── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[#2D2F3A] mb-2">My name is</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="Full name"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2E7BC4] focus:ring-2 focus:ring-[#2E7BC4]/10"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#2D2F3A] mb-2">I am</label>
            <div className="grid grid-cols-2 gap-3">
              {["brother", "sister"].map((g) => (
                <label
                  key={g}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer font-medium text-sm capitalize transition-all ${
                    form.gender === g
                      ? "border-[#1B3464] bg-[#EEF2F9] text-[#1B3464]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={g}
                    checked={form.gender === g}
                    onChange={() => setForm((p) => ({ ...p, gender: g as "brother" | "sister" }))}
                    className="sr-only"
                  />
                  A {g}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#2D2F3A] mb-2">Are you still in school?</label>
            <div className="grid grid-cols-2 gap-3">
              {["yes", "no"].map((v) => (
                <label
                  key={v}
                  className={`flex items-center justify-center p-3 rounded-xl border cursor-pointer font-medium text-sm capitalize transition-all ${
                    form.still_in_school === v
                      ? "border-[#1B3464] bg-[#EEF2F9] text-[#1B3464]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="still_in_school"
                    value={v}
                    checked={form.still_in_school === v}
                    onChange={() => setForm((p) => ({ ...p, still_in_school: v as "yes" | "no" }))}
                    className="sr-only"
                  />
                  {v === "yes" ? "Yes" : "No"}
                </label>
              ))}
            </div>
          </div>

          {isInternal && (
            <div>
              <label className="block text-sm font-semibold text-[#2D2F3A] mb-2">Position preference</label>
              <div className="grid grid-cols-1 gap-3">
                {["stay", "change"].map((v) => (
                  <label
                    key={v}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer text-sm transition-all ${
                      form.wants_position_change === v
                        ? "border-[#1B3464] bg-[#EEF2F9] text-[#1B3464]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="pos_change"
                      value={v}
                      checked={form.wants_position_change === v}
                      onChange={() => setForm((p) => ({ ...p, wants_position_change: v as "stay" | "change" }))}
                      className="sr-only"
                    />
                    {v === "stay" ? "I like where I am!" : "I want to explore other options"}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[#2D2F3A] mb-2">
              What are you expecting the time commitment to be?
            </label>
            <select
              value={form.expected_time_commitment}
              onChange={(e) => setForm((p) => ({ ...p, expected_time_commitment: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2E7BC4] bg-white"
            >
              <option value="">Select one…</option>
              {TIME_COMMITMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {!isInternal && (
            <>
              <div>
                <label className="block text-sm font-semibold text-[#2D2F3A] mb-2">Why do you want to join MIST Dallas?</label>
                <textarea
                  value={form.why_mist}
                  onChange={(e) => setForm((p) => ({ ...p, why_mist: e.target.value }))}
                  rows={3}
                  placeholder="Tell us what draws you to MIST and this work…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2E7BC4] focus:ring-2 focus:ring-[#2E7BC4]/10 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#2D2F3A] mb-2">Relevant experience or background</label>
                <textarea
                  value={form.relevant_experience}
                  onChange={(e) => setForm((p) => ({ ...p, relevant_experience: e.target.value }))}
                  rows={3}
                  placeholder="Any leadership, event planning, volunteering, or related experience…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2E7BC4] focus:ring-2 focus:ring-[#2E7BC4]/10 resize-none"
                />
              </div>
            </>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
              Back
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={!form.full_name || !form.gender || !form.still_in_school || !form.expected_time_commitment || (isInternal && !form.wants_position_change)}
              className="flex-1 bg-[#1B3464] text-white font-semibold py-3 rounded-xl hover:bg-[#2E7BC4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next: Position Ranking
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Position Ranking ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-sm text-gray-600 mb-5">
              Rank up to <strong>3 positions</strong> in order of preference. Click a role to assign it to a rank slot.
            </p>

            {/* Rank slots */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[0, 1, 2].map((i) => {
                const pos = positions.find((p) => p.id === rankings[i]);
                return (
                  <div key={i} className={`relative p-4 rounded-xl border-2 min-h-[80px] ${pos ? "border-[#1B3464] bg-[#EEF2F9]" : "border-dashed border-gray-200 bg-gray-50"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${pos ? "bg-[#1B3464]" : "bg-gray-300"}`}>
                        {i + 1}
                      </div>
                      <span className="text-xs text-gray-400 font-medium">
                        {i === 0 ? "1st choice" : i === 1 ? "2nd choice" : "3rd choice"}
                      </span>
                    </div>
                    {pos ? (
                      <>
                        <p className="text-xs font-semibold text-[#1B3464] leading-tight">{pos.title}</p>
                        <span className={`mt-1 inline-block text-xs px-1.5 py-0.5 rounded ${PHASE_COLORS[pos.phase]}`}>
                          {pos.phase}
                        </span>
                        <button
                          onClick={() => setRank(i, "")}
                          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#1B3464]/20 hover:bg-red-100 text-[#1B3464] hover:text-red-600 flex items-center justify-center text-xs transition-colors"
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400">Select below</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Position browser by team */}
            <div className="space-y-2">
              {Object.entries(byTeam)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([team, teamPositions]) => {
                  const open = expandedTeam === team;
                  return (
                    <div key={team} className="border border-gray-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedTeam(open ? null : team)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <span className="font-semibold text-sm text-[#2D2F3A]">
                          {TEAM_LABELS[team as keyof typeof TEAM_LABELS]}
                        </span>
                        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </button>
                      {open && (
                        <div className="divide-y divide-gray-50">
                          {teamPositions
                            .sort((a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase))
                            .map((pos) => {
                              const assignedRank = rankings.indexOf(pos.id);
                              const isRanked = assignedRank !== -1;
                              const nextOpen = rankings.findIndex((r) => !r);
                              return (
                                <div key={pos.id} className="flex items-center justify-between px-4 py-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-[#2D2F3A] truncate">{pos.title}</span>
                                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${PHASE_COLORS[pos.phase]}`}>
                                        {pos.phase}
                                      </span>
                                    </div>
                                  </div>
                                  {isRanked ? (
                                    <div className="flex items-center gap-2 ml-3">
                                      <div className="flex items-center gap-1 px-3 py-1.5 bg-[#1B3464] text-white rounded-lg text-xs font-semibold">
                                        <Star className="w-3 h-3 fill-current" />
                                        #{assignedRank + 1}
                                      </div>
                                      <button
                                        onClick={() => setRank(assignedRank, "")}
                                        className="text-gray-400 hover:text-red-500 text-lg leading-none transition-colors"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => nextOpen !== -1 && setRank(nextOpen, pos.id)}
                                      disabled={nextOpen === -1}
                                      className="ml-3 px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg text-xs hover:border-[#1B3464] hover:text-[#1B3464] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
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
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={rankedPositions.length === 0}
              className="flex-1 bg-[#1B3464] text-white font-semibold py-3 rounded-xl hover:bg-[#2E7BC4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next: Essay Questions
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Essays ── */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-[#2D2F3A] mb-1">
              What is ONE change you would implement in your team next year, and how would you execute it step-by-step?
            </label>
            <p className="text-xs text-gray-400 mb-3">Be specific. What's the problem, what's your solution, and how do you carry it out?</p>
            <textarea
              value={form.one_change_essay}
              onChange={(e) => setForm((p) => ({ ...p, one_change_essay: e.target.value }))}
              rows={6}
              placeholder="Describe the change and your step-by-step plan…"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2E7BC4] focus:ring-2 focus:ring-[#2E7BC4]/10 resize-none"
            />
            <div className="text-right text-xs text-gray-400 mt-1">{form.one_change_essay.length} characters</div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#2D2F3A] mb-1">
              Describe a time this year where you fell short in your role. What happened, and what would you do differently?
            </label>
            <p className="text-xs text-gray-400 mb-3">
              {isInternal
                ? "Reflect honestly on your experience this past year."
                : "This can be from any leadership, volunteer, or academic context."}
            </p>
            <textarea
              value={form.fell_short_essay}
              onChange={(e) => setForm((p) => ({ ...p, fell_short_essay: e.target.value }))}
              rows={6}
              placeholder="Be honest and reflective…"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2E7BC4] focus:ring-2 focus:ring-[#2E7BC4]/10 resize-none"
            />
            <div className="text-right text-xs text-gray-400 mt-1">{form.fell_short_essay.length} characters</div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !form.one_change_essay.trim() || !form.fell_short_essay.trim()}
              className="flex-1 bg-[#1A6B3C] text-white font-semibold py-3 rounded-xl hover:bg-[#2EA87A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit Application 🤲"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
