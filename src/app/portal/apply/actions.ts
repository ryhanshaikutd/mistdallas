"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { INTERNAL_EMAIL_DOMAIN, TIME_COMMITMENT_OPTIONS } from "@/lib/constants";

export interface ApplicationInput {
  full_name: string;
  gender: "brother" | "sister" | "";
  still_in_school: "yes" | "no" | "";
  wants_position_change: "stay" | "change" | "";
  expected_time_commitment: string;
  one_change_essay: string;
  fell_short_essay: string;
  why_mist: string;
  relevant_experience: string;
  current_position_id: string;
  commitments: Record<string, boolean>;
  /** Position ids by rank; empty strings for unranked slots. */
  rankings: string[];
}

const COMMITMENT_KEYS = [
  "understands_not_guaranteed", "understands_volunteering", "doing_for_allah",
  "will_be_professional", "understands_confidentiality", "will_attend_meetings", "willing_to_drive",
] as const;

type Result = { success: true } | { success: false; error: string };

/**
 * Submits a board application. Everything that affects eligibility or review
 * (cycle, internal flag, status) is decided here, not in the browser.
 */
export async function submitApplication(input: ApplicationInput): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { success: false, error: "Not authenticated." };

  // ── Validate ──────────────────────────────────────────────────────────────
  const fullName = input.full_name?.trim();
  if (!fullName) return { success: false, error: "Please enter your name." };
  if (input.gender !== "brother" && input.gender !== "sister") return { success: false, error: "Please select brother or sister." };
  if (input.still_in_school !== "yes" && input.still_in_school !== "no") return { success: false, error: "Please tell us if you're still in school." };
  if (!TIME_COMMITMENT_OPTIONS.some((o) => o.value === input.expected_time_commitment)) {
    return { success: false, error: "Please select a time commitment." };
  }
  const oneChange = input.one_change_essay?.trim();
  const fellShort = input.fell_short_essay?.trim();
  if (!oneChange || !fellShort) return { success: false, error: "Both essays are required." };
  if (!COMMITMENT_KEYS.every((k) => input.commitments?.[k] === true)) {
    return { success: false, error: "Please agree to every commitment." };
  }
  const rankings = (input.rankings ?? []).slice(0, 3).map((r) => (typeof r === "string" ? r : ""));
  const ranked = rankings.filter(Boolean);
  if (ranked.length === 0) return { success: false, error: "Please rank at least one position." };
  if (new Set(ranked).size !== ranked.length) return { success: false, error: "Each position can only be ranked once." };

  // ── Eligibility ───────────────────────────────────────────────────────────
  const isInternal = user.email.toLowerCase().endsWith(`@${INTERNAL_EMAIL_DOMAIN}`);
  const { data: cycle } = await supabase
    .from("recruitment_cycles")
    .select("id, type")
    .neq("type", "closed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!cycle) return { success: false, error: "Recruitment is closed right now." };
  if (cycle.type === "internal" && !isInternal) return { success: false, error: "Recruitment is internal-only right now." };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("applications")
    .select("id")
    .eq("applicant_id", user.id)
    .eq("cycle_id", cycle.id)
    .maybeSingle();
  if (existing) return { success: false, error: "You've already applied this cycle." };

  const positionIds = ranked.concat(isInternal && input.current_position_id ? [input.current_position_id] : []);
  const { data: positions } = await admin.from("positions").select("id, open_for_applications").in("id", positionIds).eq("is_active", true);
  if ((positions?.length ?? 0) !== new Set(positionIds).size) return { success: false, error: "One of the selected positions is no longer available." };
  if (positions!.some((p) => ranked.includes(p.id) && !p.open_for_applications)) {
    return { success: false, error: "That position isn't accepting applications." };
  }

  // ── Write ─────────────────────────────────────────────────────────────────
  const commitments = Object.fromEntries(COMMITMENT_KEYS.map((k) => [k, true]));
  const { data: app, error: appErr } = await admin
    .from("applications")
    .insert({
      cycle_id: cycle.id,
      applicant_id: user.id,
      applicant_email: user.email,
      applicant_name: fullName,
      gender: input.gender,
      still_in_school: input.still_in_school === "yes",
      is_internal: isInternal,
      current_position_id: isInternal && input.current_position_id ? input.current_position_id : null,
      wants_position_change: isInternal ? input.wants_position_change === "change" : null,
      expected_time_commitment: input.expected_time_commitment,
      one_change_essay: oneChange,
      fell_short_essay: fellShort,
      why_mist: !isInternal ? input.why_mist?.trim() || null : null,
      relevant_experience: !isInternal ? input.relevant_experience?.trim() || null : null,
      ...commitments,
      // status intentionally omitted → DB default 'submitted'
    })
    .select("id")
    .single();
  if (appErr || !app) {
    console.error("submitApplication insert error:", appErr?.message);
    return { success: false, error: "Could not save your application. Please try again." };
  }

  const rankPayload = rankings
    .map((posId, idx) => (posId ? { application_id: app.id, position_id: posId, rank: idx + 1 } : null))
    .filter((x): x is { application_id: string; position_id: string; rank: number } => x !== null);
  const { error: rankErr } = await admin.from("application_rankings").insert(rankPayload);
  if (rankErr) {
    console.error("submitApplication rankings error:", rankErr.message);
    await admin.from("applications").delete().eq("id", app.id);
    return { success: false, error: "Could not save your position rankings. Please try again." };
  }

  return { success: true };
}
